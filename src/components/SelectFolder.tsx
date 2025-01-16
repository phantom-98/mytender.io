import React, { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import { Button, Card, Form, Spinner } from "react-bootstrap";
import {
  faFolder,
  faFileAlt,
  faReply
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../modals/SelectFolderModal.css";

const SelectFolder = ({ onFolderSelect, initialSelectedFolders = [] }) => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  const [availableCollections, setAvailableCollections] = useState([]);
  const [folderContents, setFolderContents] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeFolder, setActiveFolder] = useState(null);
  const [selectedFolders, setSelectedFolders] = useState(() => {
    const initialSelection = new Set([...initialSelectedFolders, "default"]);
    return Array.from(initialSelection);
  });
  const [isLoading, setIsLoading] = useState(true);

  const [folderStructure, setFolderStructure] = useState({});

  const [updateTrigger, setUpdateTrigger] = useState(0);

  const getTopLevelFolders = () => {
    const folders = availableCollections.filter(
      (collection) =>
        !collection.includes("FORWARDSLASH") &&
        !collection.startsWith("TenderLibrary_")
    );

    // Sort the folders to put "default" first
    return folders.sort((a, b) => {
      if (a === "default") return -1;
      if (b === "default") return 1;
      return a.localeCompare(b);
    });
  };

  const renderBreadcrumbs = () => {
    if (!activeFolder) {
      return <span className="breadcrumb-item">Content Library</span>;
    }

    const parts = activeFolder.split("FORWARDSLASH");
    return (
      <>
        <span
          className="breadcrumb-item clickable"
          onClick={() => setActiveFolder(null)}
        >
          Content Library
        </span>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span className="breadcrumb-separator">&gt;</span>
            <span
              className={`breadcrumb-item ${index === parts.length - 1 ? "" : "clickable"}`}
              onClick={() => {
                if (index < parts.length - 1) {
                  setActiveFolder(
                    parts.slice(0, index + 1).join("FORWARDSLASH")
                  );
                }
              }}
            >
              {formatDisplayName(part)}
            </span>
          </React.Fragment>
        ))}
      </>
    );
  };

  const fetchFolderStructure = async () => {
    setIsLoading(true); // Set loading to true before fetching
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_collections`,
        {},
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );

      setAvailableCollections(response.data.collections);
      const structure = {};
      response.data.collections.forEach((collectionName) => {
        const parts = collectionName.split("FORWARDSLASH");
        let currentLevel = structure;
        parts.forEach((part, index) => {
          if (!currentLevel[part]) {
            currentLevel[part] = index === parts.length - 1 ? null : {};
          }
          currentLevel = currentLevel[part];
        });
      });

      setFolderStructure(structure);
    } catch (error) {
      console.error("Error fetching folder structure:", error);
    } finally {
      setIsLoading(false); // Set loading to false after fetching
    }
  };

  const fetchFolderContents = async (folderPath) => {
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_folder_filenames`,
        { collection_name: folderPath },
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );

      const filesWithIds = response.data.map((item) => ({
        filename: item.meta,
        unique_id: item.unique_id,
        isFolder: false
      }));

      const subfolders = availableCollections
        .filter((collection) =>
          collection.startsWith(folderPath + "FORWARDSLASH")
        )
        .map((collection) => {
          const parts = collection.split("FORWARDSLASH");
          return {
            filename: parts[parts.length - 1],
            unique_id: collection,
            isFolder: true
          };
        });

      const allContents = [...subfolders, ...filesWithIds];
      setFolderContents((prevContents) => ({
        ...prevContents,
        [folderPath]: allContents
      }));
    } catch (error) {
      console.error("Error fetching folder contents:", error);
    } finally {
      setIsLoading(false); // Set loading to false after fetching
    }
  };

  const handleFolderClick = (folderPath) => {
    setActiveFolder(folderPath);
    if (!folderContents[folderPath]) {
      fetchFolderContents(folderPath);
    }
  };

  const handleBackClick = () => {
    if (activeFolder) {
      const parts = activeFolder.split("FORWARDSLASH");
      if (parts.length > 1) {
        const parentFolder = parts.slice(0, -1).join("FORWARDSLASH");
        setActiveFolder(parentFolder);
        if (!folderContents[parentFolder]) {
          fetchFolderContents(parentFolder);
        }
      } else {
        setActiveFolder(null);
      }
    }
  };

  const handleFolderSelect = (folderPath) => {
    setSelectedFolders((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(folderPath)) {
        newSelection.delete(folderPath);
      } else {
        newSelection.add(folderPath);
      }
      const newSelectionArray = Array.from(newSelection);
      onFolderSelect(newSelectionArray);
      return newSelectionArray;
    });
  };

  useEffect(() => {
    setSelectedFolders((prev) => {
      const newSelection = new Set([...initialSelectedFolders]);
      return Array.from(newSelection);
    });
  }, [initialSelectedFolders]);

  useEffect(() => {
    fetchFolderStructure();
    if (activeFolder) {
      fetchFolderContents(activeFolder);
    }
  }, [updateTrigger, activeFolder]);

  useEffect(() => {
    if (activeFolder === null) {
      const topLevelFolders = getTopLevelFolders();
      const itemsCount = topLevelFolders.length;
      const pages = Math.ceil(itemsCount);
      setTotalPages(pages);
      setCurrentPage(1);
    } else {
      const itemsCount = folderContents[activeFolder]?.length || 0;
      const pages = Math.ceil(itemsCount);
      setTotalPages(pages);
      setCurrentPage(1);
    }
  }, [activeFolder, folderContents, availableCollections]);

  const formatDisplayName = (name) => {
    return name.replace(/_/g, " ");
  };

  const renderFolderStructure = () => {
    const topLevelFolders = getTopLevelFolders();
    const foldersToRender = topLevelFolders;

    return foldersToRender.map((folderName) => {
      const displayName =
        folderName === "default"
          ? "Whole Content Library"
          : formatDisplayName(folderName);
      return (
        <tr key={folderName}>
          <td
            className="folder-name"
            onClick={() => handleFolderClick(folderName)}
          >
            <FontAwesomeIcon
              icon={faFolder}
              className="fa-icon"
              style={{ marginRight: "10px" }}
            />
            {displayName}
          </td>
          <td className="checkbox-cell">
            <Form.Check
              type="checkbox"
              checked={selectedFolders.includes(folderName)}
              onChange={() => handleFolderSelect(folderName)}
            />
          </td>
        </tr>
      );
    });
  };

  const renderFolderContents = (folderPath) => {
    const contents = folderContents[folderPath] || [];
    const contentsToRender = contents;
    console.log(contentsToRender.length);

    return contentsToRender.map(({ filename, isFolder }, index) => {
      const fullPath = isFolder
        ? `${folderPath}FORWARDSLASH${filename}`
        : folderPath;
      const displayName = formatDisplayName(filename);
      return (
        <tr key={`${folderPath}-${index}`}>
          <td
            className="folder-name"
            onClick={() => isFolder && handleFolderClick(fullPath)}
          >
            <FontAwesomeIcon
              icon={isFolder ? faFolder : faFileAlt}
              className="fa-icon"
              style={{ marginRight: "10px" }}
            />
            {displayName}
          </td>
          {isFolder && (
            <td className="checkbox-cell">
              <Form.Check
                type="checkbox"
                checked={selectedFolders.includes(fullPath)}
                onChange={() => handleFolderSelect(fullPath)}
              />
            </td>
          )}
          {!isFolder && <td></td>}
        </tr>
      );
    });
  };

  return (
    <Card className="select-library-card-custom mt-0 mb-0">
      <Card.Body className="select-library-card-body-content">
        <div
          className="select-library-card-content-wrapper p-4"
          style={{ overflowY: "auto" }}
        >
          <div className="breadcrumb-and-back-container">
            <div className="breadcrumb-container">{renderBreadcrumbs()}</div>
            {activeFolder && (
              <div className="back-button" onClick={() => handleBackClick()}>
                <FontAwesomeIcon icon={faReply} />
                <span style={{ marginLeft: "10px" }}>Back</span>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="spinner-container">
              <Spinner
                animation="border"
                role="status"
                style={{ color: "#ff7f50" }}
              >
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <table className="library-table mt-0">
              <tbody>
                {activeFolder
                  ? renderFolderContents(activeFolder)
                  : renderFolderStructure(folderStructure)}
              </tbody>
            </table>
          )}
        </div>
      </Card.Body>
      <style jsx>{`
        .library-table td {
          padding: 13px;
        }
      `}</style>
    </Card>
  );
};

export default SelectFolder;
