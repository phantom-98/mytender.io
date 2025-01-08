import React, { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import {
  Button,
  Card,
  Modal,
  FormControl,
  InputGroup,
  Form,
  Spinner
} from "react-bootstrap";
import UploadPDF from "./UploadPDF";
import UploadText from "./UploadText";
import "./Library.css";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import handleGAEvent from "../utilities/handleGAEvent.tsx";
import {
  faFolder,
  faFileAlt,
  faEllipsisVertical,
  faSearch,
  faQuestionCircle,
  faPlus,
  faReply,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import "./Chatbot.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { UploadButtonWithDropdown } from "./UploadButtonWithDropdown.tsx";
import { Menu, MenuItem } from "@mui/material";
import FileContentModal from "../modals/FileContentModal.tsx";
import { displayAlert } from "../helper/Alert.tsx";
import LibraryContextMenu from "../modals/LibraryContextMenu.tsx";
import EllipsisMenu from "../buttons/EllipsisMenu.tsx";

const NewFolderModal = React.memo(
  ({ show, onHide, onCreateFolder, title, parentFolder }) => {
    const [localNewFolderName, setLocalNewFolderName] = useState("");
    const [error, setError] = useState("");

    const validateFolderName = (name) => {
      if (name.trim().length < 3 || name.trim().length > 63) {
        return "Folder name must be between 3 and 63 characters long.";
      }
      if (!/^[a-zA-Z0-9].*[a-zA-Z0-9\s]$/.test(name)) {
        return "Folder name must start and end with an alphanumeric character.";
      }
      if (!/^[a-zA-Z0-9_\s-]+$/.test(name)) {
        return "Folder name can only contain alphanumeric characters, spaces, underscores, or hyphens.";
      }
      if (name.includes("..")) {
        return "Folder name cannot contain two consecutive periods.";
      }
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(name)) {
        return "Folder name cannot be a valid IPv4 address.";
      }
      return "";
    };

    const handleInputChange = (e) => {
      const newName = e.target.value;
      setLocalNewFolderName(newName);
      setError(validateFolderName(newName));
    };

    const handleCreate = () => {
      const validationError = validateFolderName(localNewFolderName);
      if (validationError) {
        setError(validationError);
      } else {
        onCreateFolder(localNewFolderName, parentFolder);
        setLocalNewFolderName("");
        setError("");
      }
    };

    return (
      <Modal show={show} onHide={onHide} className="custom-modal-newbid">
        <Modal.Header className="px-4">
          <Modal.Title>{title || "Create New Folder"}</Modal.Title>
          <button className="close-button ms-auto" onClick={onHide}>
            ×
          </button>
        </Modal.Header>
        <Modal.Body className="px-4 py-4">
          <Form.Group>
            <Form.Label>
              {parentFolder ? "Subfolder Name" : "Folder Name"}
            </Form.Label>
            <FormControl
              type="text"
              placeholder={`Enter ${parentFolder ? "subfolder" : "folder"} name`}
              value={localNewFolderName}
              onChange={handleInputChange}
              isInvalid={!!error}
            />
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="upload-button"
            onClick={handleCreate}
            disabled={!!error || localNewFolderName.length === 0}
          >
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
);

const Library = () => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  const [availableCollections, setAvailableCollections] = useState([]);
  const [folderContents, setFolderContents] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState("");
  const [currentFileName, setCurrentFileName] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [totalPages, setTotalPages] = useState(0);
  const [activeFolder, setActiveFolder] = useState(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState("");
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [uploadFolder, setUploadFolder] = useState(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorElFile, setAnchorElFile] = useState(null);

  const [currentFile, setCurrentFile] = useState(null);

  const open = Boolean(anchorEl);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState(null);

  const [folderStructure, setFolderStructure] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});

  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const searchBarRef = useRef(null);

  const [updateTrigger, setUpdateTrigger] = useState(0);

  const [isLoading, setIsLoading] = useState(false);

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
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleClick = (event, file) => {
    setAnchorElFile(event.currentTarget);
    setCurrentFile(file);
  };

  const handleClose = () => {
    setAnchorElFile(null);
  };

  const handleMenuItemClick = (action) => {
    handleMenuClose();
    if (action === "pdf") handleOpenPDFModal();
    else if (action === "text") handleOpenTextModal();
  };

  const handleDelete = async (folderTitle) => {
    console.log("Deleting folder:", folderTitle);
    setFolderToDelete("");
    deleteFolder(folderTitle, newFolderParent);

    setShowDeleteFolderModal(false);
  };

  const handleNewFolderClick = useCallback((parentFolder = null) => {
    setNewFolderParent(parentFolder);
    setShowNewFolderModal(true);
  }, []);

  const handleHideNewFolderModal = useCallback(() => {
    setShowNewFolderModal(false);
    setNewFolderParent(null);
  }, []);

  const handleDeleteClick = () => {
    if (currentFile) {
      setFileToDelete({
        unique_id: currentFile.unique_id,
        filename: currentFile.filename
      });
      setShowDeleteFileModal(true);
    }
    handleClose();
  };

  const handleShowPDFModal = (event, folder) => {
    event.stopPropagation();
    setUploadFolder(folder);
    setShowPDFModal(true);
  };

  const handleShowTextModal = (event, folder) => {
    event.stopPropagation();
    setUploadFolder(folder);
    setShowTextModal(true);
  };

  const handleOpenPDFModal = () => {
    setUploadFolder(activeFolder || null); // Sfet to activeFolder if available, otherwise null
    setShowPDFModal(true);
  };

  const handleOpenTextModal = () => {
    setUploadFolder(activeFolder || null); // Set to activeFolder if available, otherwise null
    setShowTextModal(true);
  };

  const fetchFolderStructure = async () => {
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_collections`,
        {},
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );

      //console.log(response.data);
      setAvailableCollections(response.data.collections);
      console.log(response.data.collections);
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

      // Get subfolders
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
    }
  };

  const handleCreateFolder = useCallback(
    async (folderName, parentFolder = null) => {
      try {
        const formattedFolderName = folderName.trim().replace(/\s+/g, "_");
        const formData = new FormData();
        formData.append("folder_name", formattedFolderName);
        if (parentFolder) {
          formData.append("parent_folder", parentFolder);
        }

        const response = await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/create_upload_folder`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "multipart/form-data"
            }
          }
        );

        if (response.data.message === "Folder created successfully") {
          displayAlert(
            `${parentFolder ? "Subfolder" : "Folder"} created successfully`,
            "success"
          );

          // Refresh the folder structure
          await fetchFolderStructure();

          // If we're creating a subfolder, refresh the contents of the parent folder
          if (parentFolder) {
            await fetchFolderContents(parentFolder);
          } else {
            // If we're creating a top-level folder, refresh the root folder contents
            setActiveFolder(null);
            await fetchFolderContents("");
          }

          setUpdateTrigger((prev) => prev + 1);
          setShowNewFolderModal(false);
        } else {
          displayAlert(
            `Failed to create ${parentFolder ? "subfolder" : "folder"}`,
            "danger"
          );
        }
      } catch (error) {
        console.error(
          `Error creating ${parentFolder ? "subfolder" : "folder"}:`,
          error
        );
        displayAlert(
          `Error, ${parentFolder ? "subfolder" : "folder"} limit reached. Try using a shorter folder name...`,
          "danger"
        );
      }
    },
    [tokenRef, fetchFolderStructure, fetchFolderContents, setActiveFolder]
  );

  const modalRef = useRef();
  const closeModal = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setShowPdfViewerModal(false);
      setShowModal(true); // Close the modal after saving
    }
  };

  const handleOnClose = () => {
    setShowPDFModal(false);
    fetchFolderStructure();
    if (uploadFolder) {
      fetchFolderContents(uploadFolder);
    }
    setUpdateTrigger((prev) => prev + 1);
  };

  const UploadPDFModal = ({
    show,
    onHide,
    folder,
    get_collections,
    onClose
  }) => (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header className="px-4">
        <Modal.Title>Upload Files</Modal.Title>
        <button className="close-button ms-auto" onClick={onHide}>
          ×
        </button>
      </Modal.Header>
      <Modal.Body className="px-4 py-4">
        <UploadPDF
          folder={folder}
          get_collections={get_collections}
          onClose={onClose}
          apiUrl={`http${HTTP_PREFIX}://${API_URL}/uploadfile/`}
          descriptionText="Upload previous bids here for the AI to use as context in the Q&A
        Generator. This might take a while for large documents because we need
        to convert the documents into a format the AI can understand so sit
        tight!"
        />
      </Modal.Body>
    </Modal>
  );

  const UploadTextModal = ({ show, onHide, folder, get_collections }) => (
    <Modal
      show={show}
      onHide={() => {
        onHide();
      }}
      onClick={(e) => e.stopPropagation()}
      size="lg"
    >
      <Modal.Header className="px-4" onClick={(e) => e.stopPropagation()}>
        <Modal.Title>Text Uploader</Modal.Title>
        <button className="close-button ms-auto" onClick={onHide}>
          ×
        </button>
      </Modal.Header>
      <Modal.Body className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <UploadText
          folder={folder}
          get_collections={get_collections}
          onClose={() => {
            onHide();
            setUpdateTrigger((prev) => prev + 1);
            if (folder) {
              fetchFolderContents(folder);
            }
          }}
        />
      </Modal.Body>
    </Modal>
  );

  const DeleteFolderModal = ({ show, onHide, onDelete, folderTitle }) => {
    const displayFolderName = folderTitle
      .replace(/FORWARDSLASH/g, "/")
      .replace(/_/g, " ");
    return (
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Delete Folder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the folder "{displayFolderName}"?
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="upload-button"
            style={{ backgroundColor: "red" }}
            onClick={() => onDelete(folderTitle)}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  const DeleteFileModal = ({ show, onHide, onDelete, fileName }) => (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Delete File</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to delete the file "{fileName}"?
      </Modal.Body>
      <Modal.Footer>
        <Button
          className="upload-button"
          style={{ backgroundColor: "red" }}
          onClick={() => onDelete()}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );

  const saveFileContent = async (id, newContent, folderName) => {
    try {
      const formData = new FormData();
      formData.append("id", id); // Make sure this matches your FastAPI endpoint's expected field
      formData.append("text", newContent);
      formData.append("profile_name", folderName);
      formData.append("mode", "plain");

      await axios.post(`http${HTTP_PREFIX}://${API_URL}/updatetext`, formData, {
        headers: {
          Authorization: `Bearer ${tokenRef.current}`
        }
      });

      setModalContent(newContent); // Update the modal content with the new content

      console.log("Content updated successfully");
    } catch (error) {
      console.error("Error saving file content:", error);
    }
  };

  const viewFile = async (fileName, folderName, unique_id) => {
    setIsLoading(true);
    setShowModal(true);
    setModalContent(null);
    const formData = new FormData();
    formData.append("file_name", fileName);
    formData.append("profile_name", folderName);

    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/show_file_content`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );

      setModalContent(response.data);
      setCurrentFileId(unique_id);
      setCurrentFileName(fileName);
    } catch (error) {
      console.error("Error viewing file:", error);
      displayAlert("Error loading document", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const viewPdfFile = async (fileName, folderName) => {
    setIsLoading(true);
    setPdfUrl(null);
    setShowPdfViewerModal(true);
    const formData = new FormData();
    formData.append("file_name", fileName);
    formData.append("profile_name", folderName);

    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/show_file_content_pdf_format`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          },
          responseType: "blob"
        }
      );

      const fileURL = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      setPdfUrl(fileURL);
    } catch (error) {
      console.error("Error viewing PDF file:", error);
      if (error.response && error.response.status === 404) {
        displayAlert(
          "PDF file not found, try reuploading the pdf file",
          "danger"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };
  const deleteDocument = async (uniqueId) => {
    const formData = new FormData();
    formData.append("unique_id", uniqueId);

    try {
      await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/delete_template_entry/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      handleGAEvent("Library", "Delete Document", "Delete Document Button");
      setUpdateTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const deleteFolder = useCallback(
    async (folderTitle, parentFolder = null) => {
      const formData = new FormData();
      formData.append("profile_name", folderTitle);

      try {
        await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/delete_template/`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "multipart/form-data"
            }
          }
        );

        handleGAEvent("Library", "Delete Folder", "Delete Folder Button");
        setUpdateTrigger((prev) => prev + 1);
        console.log("folder deleted");
        await fetchFolderStructure();

        // If we're creating a subfolder, refresh the contents of the parent folder
        if (parentFolder) {
          await fetchFolderContents(parentFolder);
        } else {
          // If we're creating a top-level folder, refresh the root folder contents
          setActiveFolder(null);
          await fetchFolderContents("");
        }

        setUpdateTrigger((prev) => prev + 1);
      } catch (error) {
        console.error("Error deleting folder:", error);
      }
    },
    [tokenRef, fetchFolderStructure, fetchFolderContents, setActiveFolder]
  );

  const handleFolderClick = (folderPath) => {
    console.log(`Folder clicked: ${folderPath}`);
    setActiveFolder(folderPath);
    if (!folderContents[folderPath]) {
      console.log(
        `Fetching contents for ${folderPath} as they don't exist yet`
      );
      fetchFolderContents(folderPath);
    } else {
      console.log(
        `Contents for ${folderPath} already exist:`,
        folderContents[folderPath]
      );
    }
  };

  const handleBackClick = () => {
    if (activeFolder) {
      const parts = activeFolder.split("FORWARDSLASH");
      if (parts.length > 1) {
        // Go up one level
        const parentFolder = parts.slice(0, -1).join("FORWARDSLASH");
        setActiveFolder(parentFolder);
        if (!folderContents[parentFolder]) {
          fetchFolderContents(parentFolder);
        }
      } else {
        // If we're at the root level, go back to the main folder view
        setActiveFolder(null);
      }
    }
  };
  useEffect(() => {
    fetchFolderStructure();
    if (activeFolder) {
      fetchFolderContents(activeFolder);
    }
  }, [updateTrigger, activeFolder]);

  useEffect(() => {
    setShowDropdown(searchQuery.length > 0);
  }, [searchQuery]);

  // useEffect(() => {
  //   if (activeFolder === null) {
  //     const topLevelFolders = getTopLevelFolders();
  //     const itemsCount = topLevelFolders.length;
  //     const pages = Math.ceil(itemsCount / rowsPerPage);
  //     setTotalPages(pages);
  //     setCurrentPage(1);
  //   } else {
  //     const itemsCount = folderContents[activeFolder]?.length || 0;
  //     const pages = Math.ceil(itemsCount / rowsPerPage);
  //     setTotalPages(pages);
  //     setCurrentPage(1); // Reset to first page when changing folders
  //   }
  // }, [activeFolder, folderContents, availableCollections, rowsPerPage]);

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
        <tr
          key={folderName}
          onClick={() => handleFolderClick(folderName)}
          onContextMenu={(e) =>
            handleContextMenu(e, true, folderName, folderName)
          }
          style={{ cursor: "pointer" }}
        >
          <td>
            <FontAwesomeIcon
              icon={faFolder}
              className="fa-icon"
              style={{ marginRight: "10px" }}
            />
            {displayName}
          </td>
          <td colSpan={3}>
            <UploadButtonWithDropdown
              folder={folderName}
              handleShowPDFModal={handleShowPDFModal}
              handleShowTextModal={handleShowTextModal}
              setShowDeleteFolderModal={setShowDeleteFolderModal}
              setFolderToDelete={setFolderToDelete}
              handleNewFolderClick={handleNewFolderClick}
            />
          </td>
        </tr>
      );
    });
  };

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<{
    isFolder: boolean;
    id: string;
    path: string;
  } | null>(null);

  const handleContextMenu = (
    event: React.MouseEvent,
    isFolder: boolean,
    id: string,
    path: string
  ) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY
    });
    setContextMenuTarget({ isFolder, id, path });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
    setContextMenuTarget(null);
  };

  const renderFolderContents = (folderPath) => {
    console.log("Rendering contents for folder:", folderPath);
    const contents = folderContents[folderPath] || [];
    console.log("Raw contents:", contents);

    // Filter to only show direct children
    const directChildren = contents.filter(
      ({ filename, unique_id, isFolder }) => {
        console.log("\nChecking item:", unique_id);

        if (!isFolder) return true; // Files are always direct children

        // Get the relative path by removing the current folder path
        const relativePath = unique_id.replace(folderPath + "FORWARDSLASH", "");
        console.log("Relative path:", relativePath);

        // Count how many FORWARDSLASH are in the relative path
        const forwardSlashCount = (relativePath.match(/FORWARDSLASH/g) || [])
          .length;
        console.log("Forward slash count:", forwardSlashCount);

        // A direct child should have no additional FORWARDSLASH in its relative path
        const isDirectChild = forwardSlashCount === 0;
        console.log("Is direct child?", isDirectChild);

        return isDirectChild;
      }
    );

    console.log("Filtered direct children:", directChildren);

    return directChildren.map(({ filename, unique_id, isFolder }, index) => {
      const fullPath = isFolder
        ? `${folderPath}FORWARDSLASH${filename}`
        : folderPath;
      const displayName = formatDisplayName(filename);

      return (
        <tr
          key={`${folderPath}-${index}`}
          style={{ cursor: "pointer" }}
          onContextMenu={(e) =>
            handleContextMenu(e, isFolder, unique_id, fullPath)
          }
        >
          <td
            onClick={() =>
              isFolder
                ? handleFolderClick(fullPath)
                : viewFile(filename, folderPath, unique_id)
            }
          >
            <FontAwesomeIcon
              icon={isFolder ? faFolder : faFileAlt}
              className="fa-icon"
              style={{ marginRight: "10px" }}
            />
            {displayName}
          </td>
          <td colSpan={3}>
            {isFolder ? (
              <UploadButtonWithDropdown
                folder={fullPath}
                handleShowPDFModal={handleShowPDFModal}
                handleShowTextModal={handleShowTextModal}
                setShowDeleteFolderModal={setShowDeleteFolderModal}
                setFolderToDelete={setFolderToDelete}
                handleNewFolderClick={handleNewFolderClick}
              />
            ) : (
              <EllipsisMenu
                filename={filename}
                unique_id={unique_id}
                onDelete={() => {
                  setFileToDelete({
                    unique_id: unique_id,
                    filename: filename
                  });
                  setShowDeleteFileModal(true);
                }}
              />
            )}
          </td>
        </tr>
      );
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
              {part === "default"
                ? "Whole Content Library"
                : formatDisplayName(part)}
            </span>
          </React.Fragment>
        ))}
      </>
    );
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query.length > 0) {
      const folderMatches = availableCollections
        .filter((collection) => collection.toLowerCase().includes(query))
        .map((collection) => ({
          name: collection.split("FORWARDSLASH").pop(), // Get the last part of the path
          type: "folder",
          path: collection,
          fullName: collection.replace(/FORWARDSLASH/g, "/") // Full path for display
        }));

      const fileMatches = Object.entries(folderContents).flatMap(
        ([folder, contents]) =>
          contents
            .filter((item) => item.filename.toLowerCase().includes(query))
            .map((item) => ({
              name: item.filename,
              type: item.isFolder ? "folder" : "file",
              path: folder,
              fullName: `${folder.replace(/FORWARDSLASH/g, "/")}/${item.filename}`,
              unique_id: item.unique_id
            }))
      );

      const results = [...folderMatches, ...fileMatches];
      setFilteredResults(results);
      setShowSearchResults(true);
    } else {
      setFilteredResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchResultClick = async (result) => {
    if (result.type === "folder") {
      setActiveFolder(result.path);
      setCurrentPage(1);
      if (
        !folderContents[result.path] ||
        folderContents[result.path].length === 0
      ) {
        await fetchFolderContents(result.path);
      }
    } else if (result.type === "file") {
      setActiveFolder(result.path);
      setCurrentPage(1);

      if (
        !folderContents[result.path] ||
        folderContents[result.path].length === 0
      ) {
        await fetchFolderContents(result.path);
      }

      // Wait for state to update
      setTimeout(() => {
        viewFile(result.name, result.path, result.unique_id);
      }, 100);
    }

    // Clear search query immediately
    setSearchQuery("");

    // Delay hiding the dropdown and search results
    setTimeout(() => {
      setShowSearchResults(false);
      setShowDropdown(false);
    }, 200);
  };

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    return (
      <div className="search-results-dropdown">
        {filteredResults.length === 0 ? (
          <div className="search-result-item">
            <FontAwesomeIcon icon={faQuestionCircle} className="result-icon" />
            No results found...
          </div>
        ) : (
          filteredResults.map((result, index) => (
            <div
              key={index}
              className="search-result-item"
              onClick={() => handleSearchResultClick(result)}
            >
              <FontAwesomeIcon
                icon={result.type === "file" ? faFileAlt : faFolder}
                className="result-icon"
              />
              {result.type === "file"
                ? `${result.name} (in ${result.path.replace(/FORWARDSLASH/g, "/")})`
                : result.fullName}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="chatpage">
      <SideBarSmall />

      <div className="lib-container">
        <div className="scroll-container">
          <h1 className="heavy">Content Library</h1>

          <Card className="library-card-custom">
            <Card.Body className="library-card-body-content">
              <div className="library-card-content-wrapper">
                <div className="header-row mt-2">
                  <div
                    className="lib-title"
                    id="library-table"
                    style={{ marginLeft: "15px" }}
                  >
                    Resources
                  </div>

                  <div
                    className="search-container"
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      width: "100%"
                    }}
                  >
                    <InputGroup
                      className={`search-bar-container ${showDropdown ? "dropdown-visible" : ""}`}
                      ref={searchBarRef}
                      style={{ maxWidth: "900px", width: "100%" }}
                    >
                      <FontAwesomeIcon
                        icon={faSearch}
                        className="search-icon"
                      />
                      <FormControl
                        placeholder="Search folders and files"
                        aria-label="Search"
                        aria-describedby="basic-addon2"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => {
                          setShowDropdown(true);
                          setShowSearchResults(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowDropdown(false);
                            setShowSearchResults(false);
                          }, 200);
                        }}
                        className={`search-bar-library ${showDropdown ? "dropdown-visible" : ""}`}
                      />
                      {searchQuery && (
                        <div
                          className="clear-search-icon"
                          onClick={() => {
                            setSearchQuery("");
                            setShowDropdown(false);
                            setShowSearchResults(false);
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </div>
                      )}
                      {renderSearchResults()}
                    </InputGroup>
                  </div>
                  <label id="search-bar-container"> </label>
                  <div
                    className="button-container"
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      minWidth: "150px",
                      minHeight: "40px"
                    }}
                  >
                    {!activeFolder && (
                      <Button
                        onClick={() => handleNewFolderClick(null)}
                        className="upload-button"
                        style={{ fontSize: "17px" }}
                        id="new-folder"
                      >
                        <FontAwesomeIcon
                          icon={faPlus}
                          style={{ marginRight: "8px" }}
                        />
                        New Folder
                      </Button>
                    )}

                    {activeFolder && (
                      <Button
                        aria-controls="simple-menu"
                        aria-haspopup="true"
                        onClick={handleMenuClick}
                        className="upload-button"
                        style={{ fontSize: "17px" }}
                      >
                        <FontAwesomeIcon
                          icon={faPlus}
                          style={{ marginRight: "8px" }}
                        />
                        Upload
                      </Button>
                    )}
                  </div>
                </div>

                <Menu
                  id="long-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={open}
                  onClose={handleMenuClose}
                  PaperProps={{
                    style: {
                      width: "220px" // Reduced width
                    }
                  }}
                >
                  <MenuItem
                    onClick={() => handleMenuItemClick("pdf")}
                    className="styled-menu-item"
                  >
                    <i className="fas fa-file-pdf styled-menu-item-icon"></i>
                    Upload PDF/Word/Excel
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleMenuItemClick("text")}
                    className="styled-menu-item"
                  >
                    <i className="fas fa-file-alt styled-menu-item-icon"></i>
                    Upload Text
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleNewFolderClick(activeFolder)}
                    className="styled-menu-item"
                  >
                    <FontAwesomeIcon
                      icon={faFolder}
                      className="styled-menu-item-icon"
                    />
                    New Subfolder
                  </MenuItem>
                </Menu>
                <div style={{ width: "100%", marginTop: "20px" }}>
                  <table className="library-table">
                    <thead>
                      <tr>
                        <th>{renderBreadcrumbs()}</th>
                        <th colSpan={3}>
                          {activeFolder && (
                            <div
                              className="back-button"
                              onClick={() => handleBackClick()}
                              style={{ cursor: "pointer", padding: "5px" }}
                            >
                              <FontAwesomeIcon icon={faReply} />
                              <span style={{ marginLeft: "10px" }}>Back</span>
                            </div>
                          )}
                        </th>
                      </tr>
                    </thead>
                  </table>

                  <div
                    style={{
                      overflowY: "auto",
                      maxHeight: "650px",
                      height: "100%",
                      width: "100%"
                    }}
                  >
                    <table style={{ width: "100%" }} className="library-table">
                      <tbody>
                        {activeFolder
                          ? renderFolderContents(activeFolder)
                          : renderFolderStructure()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          <FileContentModal
            showModal={showModal}
            setShowModal={setShowModal}
            modalContent={modalContent}
            onSave={(newContent) =>
              saveFileContent(currentFileId, newContent, activeFolder)
            }
            documentId={currentFileId}
            fileName={currentFileName}
            folderName={activeFolder}
            onViewPdf={viewPdfFile}
            isLoading={isLoading}
          />

          <DeleteFolderModal
            show={showDeleteFolderModal}
            onHide={() => setShowDeleteFolderModal(false)}
            onDelete={() => handleDelete(folderToDelete)}
            folderTitle={folderToDelete}
          />

          <DeleteFileModal
            show={showDeleteFileModal}
            onHide={() => setShowDeleteFileModal(false)}
            onDelete={() => {
              deleteDocument(fileToDelete.unique_id);
              setShowDeleteFileModal(false);
            }}
            fileName={fileToDelete ? fileToDelete.filename : ""}
          />

          <UploadPDFModal
            show={showPDFModal}
            onHide={() => setShowPDFModal(false)}
            folder={uploadFolder}
            get_collections={fetchFolderStructure}
            onClose={handleOnClose}
          />

          <UploadTextModal
            show={showTextModal}
            onHide={() => setShowTextModal(false)}
            folder={uploadFolder}
            get_collections={fetchFolderStructure}
          />

          <NewFolderModal
            show={showNewFolderModal}
            onHide={handleHideNewFolderModal}
            onCreateFolder={handleCreateFolder}
            title={
              newFolderParent ? "Create New Subfolder" : "Create New Folder"
            }
            parentFolder={newFolderParent}
          />

          {contextMenu && contextMenuTarget && (
            <LibraryContextMenu
              anchorPosition={{ x: contextMenu.mouseX, y: contextMenu.mouseY }}
              isOpen={Boolean(contextMenu)}
              onClose={handleContextMenuClose}
              onDelete={() => {
                if (contextMenuTarget.isFolder) {
                  setFolderToDelete(contextMenuTarget.path);
                  setShowDeleteFolderModal(true);
                } else {
                  setFileToDelete({
                    unique_id: contextMenuTarget.id,
                    filename:
                      folderContents[activeFolder]?.find(
                        (item) => item.unique_id === contextMenuTarget.id
                      )?.filename || ""
                  });
                  setShowDeleteFileModal(true);
                }
                handleContextMenuClose();
              }}
              isFolder={contextMenuTarget.isFolder}
              folderPath={contextMenuTarget.path}
              onUploadPDF={(event) => {
                handleShowPDFModal(event, contextMenuTarget.path);
                handleContextMenuClose();
              }}
              onUploadText={(event) => {
                handleShowTextModal(event, contextMenuTarget.path);
                handleContextMenuClose();
              }}
              onNewSubfolder={() => {
                handleNewFolderClick(contextMenuTarget.path);
                handleContextMenuClose();
              }}
            />
          )}

          {showPdfViewerModal && (
            <div className="pdf-viewer-modal" onClick={closeModal}>
              <div className="pdf-viewer-modal-content" ref={modalRef}>
                {isLoading && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      zIndex: 1000
                    }}
                  >
                    <Spinner
                      animation="border"
                      style={{
                        width: "2rem",
                        height: "2rem",
                        color: "black"
                      }}
                    />
                  </div>
                )}
                <iframe src={pdfUrl} width="100%" height="700px"></iframe>
              </div>
            </div>
          )}
        </div>
        {/* <LibraryWizard /> */}
      </div>
    </div>
  );
};

export default withAuth(Library);
