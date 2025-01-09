import React, { useEffect, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import { Button, Col, Row, Card, Modal, Spinner, Table } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faFileAlt, faPlus, faSort, faSortUp, faSortDown } from "@fortawesome/free-solid-svg-icons";
import { Menu, MenuItem } from "@mui/material";
import { displayAlert } from "../helper/Alert.tsx";
import InterrogateTenderModal from "../modals/InterrogateTenderModal.tsx";
import posthog from "posthog-js";
import UploadPDF from "../views/UploadPDF.tsx";
import "./TenderLibrary.css";

const TenderLibrary = ({ object_id }) => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  // Updated state to include timestamps
  const [documents, setDocuments] = useState([]);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 6;
  const [totalPages, setTotalPages] = useState(0);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showDeleteFileModal, setShowDeleteFileModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [showPdfViewerModal, setShowPdfViewerModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [documentListVersion, setDocumentListVersion] = useState(0);
  const [showWordModal, setShowWordModal] = useState(false);
  const [wordFileContent, setWordFileContent] = useState(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelData, setExcelData] = useState(null);

  const [sortOrder, setSortOrder] = useState("asc");
  const [isSorted, setIsSorted] = useState(false);

  // Add this new function to handle sorting
  const handleSort = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSortOrder);
    setIsSorted(true);

    const sortedDocs = [...documents].sort((a, b) => {
      const filenameA = (a.filename || a).toLowerCase();
      const filenameB = (b.filename || b).toLowerCase();

      if (newSortOrder === "asc") {
        return filenameA.localeCompare(filenameB);
      } else {
        return filenameB.localeCompare(filenameA);
      }
    });

    setDocuments(sortedDocs);
  };

  // Get the correct sort icon based on current state
  const getSortIcon = () => {
    if (!isSorted) return faSort;
    return sortOrder === "asc" ? faSortUp : faSortDown;
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

  const handleMenuItemClick = (action) => {
    handleMenuClose();
    if (action === "pdf") setShowPDFModal(true);
  };

  const handleDeleteFileClick = (event, filename) => {
    event.stopPropagation();
    posthog.capture("tender_library_delete_file_clicked", { filename });
    setFileToDelete({ filename });
    setShowDeleteFileModal(true);
  };

  const fetchDocuments = async () => {
    try {
      if (object_id) {
        const response = await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/get_tender_library_doc_filenames`,
          { bid_id: object_id }, // Send as JSON body
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "application/json" // Changed to JSON
            }
          }
        );
        console.log("tender library docs", response);
        setDocuments(response.data.filenames);
        const pages = Math.ceil(response.data.filenames.length / rowsPerPage);
        setTotalPages(pages);
      }
    } catch (error) {
      console.error("Error fetching tender library filenames:", error);
      displayAlert("Error fetching documents", "danger");
    }
  };

  const deleteDocument = async (filename, bidId) => {
    const formData = new FormData();
    formData.append("bid_id", bidId);
    formData.append("filename", filename);
    console.log(formData);
    try {
      await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/delete_file_tenderlibrary`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      // Refresh the document list or update the state as needed
      fetchDocuments();
      setDocumentListVersion((prev) => prev + 1);
      displayAlert("Document deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting document:", error);
      if (error.response) {
        displayAlert(
          `Error deleting document: ${error.response.data.detail}`,
          "danger"
        );
      } else if (error.request) {
        displayAlert(
          "Error deleting document: No response from server",
          "danger"
        );
      } else {
        displayAlert("Error deleting document: Request setup failed", "danger");
      }
    }
  };

  const viewFile = async (fileName) => {
    try {
      posthog.capture("tender_library_view_file", {
        fileName,
        fileType: fileName.split(".").pop().toLowerCase()
      });
      const formData = new FormData();
      formData.append("bid_id", object_id);
      formData.append("file_name", fileName);

      const fileExtension = fileName.split(".").pop().toLowerCase();

      if (fileExtension === "pdf") {
        setIsPdfLoading(true);
        setShowPdfViewerModal(true);

        const response = await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/show_tenderLibrary_file_content_pdf_format`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "multipart/form-data"
            },
            responseType: "blob"
          }
        );
        const fileURL = URL.createObjectURL(
          new Blob([response.data], { type: "application/pdf" })
        );
        setPdfUrl(fileURL);
        setIsPdfLoading(false);
      } else if (["doc", "docx"].includes(fileExtension)) {
        const response = await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/show_tenderLibrary_file_content_word_format`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`,
              "Content-Type": "multipart/form-data"
            }
          }
        );
        setWordFileContent(response.data.content);
        setCurrentFileName(fileName);
        setShowWordModal(true);
      } else if (["xls", "xlsx"].includes(fileExtension)) {
        console.log("viewing excel files not supported yet");
      } else {
        throw new Error("Unsupported file type");
      }
    } catch (error) {
      console.error("Error viewing file:", error);
      displayAlert("Error viewing file", "danger");
      setIsPdfLoading(false);
      setShowPdfViewerModal(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [object_id, documentListVersion]);

  const renderDocuments = () => {
    if (documents.length === 0) {
      return (
        <tr>
          <td colSpan="3" className="py-5">
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                minHeight: "250px"
              }}
            >
              <div style={{ width: "750px" }}>
                <p
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.6",
                    textAlign: "center",
                    margin: 0,
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                    marginBottom: "16px"
                  }}
                >
                  Upload documents related to this specific tender here. This is
                  different from your previous bids and company information
                  which belong in your Content Library. They will also be used
                  as context in the Q&A Generator to answer questions about this
                  tender.
                </p>
              </div>
            </div>
          </td>
        </tr>
      );
    }

    return documents.map((doc, index) => (
      <tr key={index} style={{ cursor: "pointer" }}>
        <td
          className="filename-column"
          onClick={() => viewFile(doc.filename || doc)}
        >
          <FontAwesomeIcon icon={faFileAlt} className="fa-icon" />{" "}
          {doc.filename || doc}
        </td>

        <td className="timestamp-column">
  {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString('en-GB') : "N/A"}
</td>
        <td className="actions-column">
          <FontAwesomeIcon
            icon={faTrash}
            className="action-icon delete-icon"
            onClick={(event) =>
              handleDeleteFileClick(event, doc.filename || doc)
            }
            style={{ cursor: "pointer" }}
          />
        </td>
      </tr>
    ));
  };

  const handleOnClose = () => {
    setShowPDFModal(false);
    fetchDocuments();
  };

  const UploadPDFModal = ({ show, onHide, get_collections, onClose }) => (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header className="px-4">
        <Modal.Title>Upload Files</Modal.Title>
        <button className="close-button ms-auto" onClick={onHide}>
          ×
        </button>
      </Modal.Header>
      <Modal.Body className="px-4 py-4">
        <UploadPDF
          bid_id={object_id}
          get_collections={get_collections}
          onClose={onClose}
          apiUrl={`http${HTTP_PREFIX}://${API_URL}/uploadfile_tenderlibrary`}
          descriptionText="Documents uploaded to the Tender Library will be used as context by
    our AI to generate compliance requirements and opportunity
    information for the Tender."
        />
      </Modal.Body>
    </Modal>
  );

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

  // Add Excel Modal Component
  const ExcelViewerModal = ({ show, onHide, data, fileName }) => (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{fileName}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {data && data.sheets ? (
          Object.entries(data.sheets).map(([sheetName, sheetData]) => (
            <div key={sheetName} className="mb-4">
              <h4>{sheetName}</h4>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    {sheetData[0] &&
                      sheetData[0].map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ))
        ) : (
          <p>No data available</p>
        )}
      </Modal.Body>
    </Modal>
  );

  return (
    <>
      <Row>
        <Col md={12}>
          <Card className="mb-2">
            <Card.Body className="tenderlibrary-card-body-content">
              <div className="library-card-content-wrapper">
                <div className="header-row mt-2" id="tender-library">
                  <div className="lib-title">Tender Upload</div>
                  <div>
                    {/* <InterrogateTenderModal bid_id={object_id} /> */}
                    <Button
                      aria-controls="simple-menu"
                      aria-haspopup="true"
                      onClick={() => handleMenuItemClick("pdf")}
                      className="upload-button"
                      style={{ marginLeft: "5px" }}
                    >
                      <FontAwesomeIcon
                        icon={faPlus}
                        style={{ marginRight: "8px" }}
                      />
                      Upload Document
                    </Button>
                  </div>
                </div>
                <div style={{ width: "100%", marginTop: "30px" }}>
                  <table className="tender-library-table">
                    <thead>
                      <tr>
                        <th className="filename-column">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer"
                            }}
                            onClick={handleSort}
                          >
                            Filename
                            <FontAwesomeIcon
                              icon={getSortIcon()}
                              style={{
                                fontSize: "14px",
                                color: isSorted ? "#000" : "#999"
                              }}
                            />
                          </div>
                        </th>
                        <th className="timestamp-column">Upload Date</th>
                        <th className="actions-column">Actions</th>
                      </tr>
                    </thead>
                  </table>

                  <div
                    style={{
                      overflowY: "auto",
                      maxHeight: "400px",
                      height: "100%",
                      width: "100%"
                    }}
                  >
                    <table
                      style={{ width: "100%" }}
                      className="tender-library-table"
                    >
                      <tbody>{renderDocuments()}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <DeleteFileModal
        show={showDeleteFileModal}
        onHide={() => setShowDeleteFileModal(false)}
        onDelete={() => {
          deleteDocument(fileToDelete.filename, object_id);
          setShowDeleteFileModal(false);
        }}
        fileName={fileToDelete ? fileToDelete.filename : ""}
      />

      <UploadPDFModal
        show={showPDFModal}
        onHide={() => setShowPDFModal(false)}
        get_collections={fetchDocuments}
        onClose={handleOnClose}
      />

      <ExcelViewerModal
        show={showExcelModal}
        onHide={() => setShowExcelModal(false)}
        data={excelData}
        fileName={currentFileName}
      />

      {showPdfViewerModal && (
        <div
          className="pdf-viewer-modal"
          onClick={() => setShowPdfViewerModal(false)}
        >
          <div
            className="pdf-viewer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {isPdfLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "600px"
                }}
              >
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
              </div>
            ) : (
              <iframe src={pdfUrl} width="100%" height="600px"></iframe>
            )}
          </div>
        </div>
      )}

      {showWordModal && (
        <Modal
          show={showWordModal}
          onHide={() => setShowWordModal(false)}
          size="lg"
          style={{
            display: "flex",
            justifyContent: "center",
            textAlign: "center"
          }}
        >
          <Modal.Header closeButton>
            <Modal.Title style={{ textAlign: "center" }}>
              File Content
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ height: "600px" }}>
            <pre
              style={{
                width: "100%",
                height: "100%",
                padding: "20px",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                overflowX: "hidden",
                borderRadius: "4px",
                border: "1px solid #ccc"
              }}
            >
              {wordFileContent}
            </pre>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default withAuth(TenderLibrary);
