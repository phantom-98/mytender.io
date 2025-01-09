import React, { useRef, useState } from "react";
import axios from "axios";
import { useAuthUser } from "react-auth-kit";
import { displayAlert } from "../helper/Alert";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./UploadPDF.css";
import {
  faFileArrowUp,
  faFilePdf,
  faFile,
  faFileExcel,
  faFileWord
} from "@fortawesome/free-solid-svg-icons";
import posthog from "posthog-js";

interface UploadResult {
  error?: Error;
  data?: any;
}
interface UploadPDFProps {
  folder?: string;
  bid_id?: string;
  get_collections?: () => void;
  onClose?: () => void;
  onUploadComplete?: (files: File[]) => void;
  apiUrl: string;
  descriptionText: string;
}

interface UploadProgress {
  [key: string]: number;
}

const UploadPDF: React.FC<UploadPDFProps> = ({
  folder,
  bid_id,
  get_collections,
  onClose,
  onUploadComplete,
  apiUrl,
  descriptionText
}) => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

  const getFileMode = (fileType) => {
    if (fileType === "application/pdf") {
      return "pdf";
    } else if (
      fileType === "application/msword" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return "word";
    } else if (
      fileType === "application/vnd.ms-excel" ||
      fileType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return "excel";
    }
    return null;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only handle drag events if not currently uploading
    if (!isUploading) {
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Only handle drop if not currently uploading
    if (
      !isUploading &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    // Only handle file selection if not currently uploading
    if (!isUploading && e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    const invalidTypeFiles = newFiles.filter(
      (file) => !allowedTypes.includes(file.type)
    );

    const validFiles = newFiles.filter((file) =>
      allowedTypes.includes(file.type)
    );

    setSelectedFiles((prevFiles) => [...prevFiles, ...validFiles]);

    if (validFiles.length > 0) {
      posthog.capture("pdf_upload_files_selected", {
        fileCount: validFiles.length,
        fileTypes: validFiles.map((f) => f.type)
      });
    }

    if (invalidTypeFiles.length > 0) {
      displayAlert(
        "Some files were not added due to invalid file type. Please select PDF, Word, or Excel files only.",
        "danger"
      );
      posthog.capture("pdf_upload_invalid_file_types", {
        fileCount: invalidTypeFiles.length,
        fileTypes: invalidTypeFiles.map((f) => f.type)
      });
    }
  };

  const uploadFile = async (file: File) => {
    posthog.capture("pdf_upload_started", {
      fileName: file.name,
      fileType: file.type
    });

    const mode = getFileMode(file.type);
    if (!mode) {
      throw new Error("Unsupported file type");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    if (folder) {
      formData.append("profile_name", encodeURIComponent(folder));
    }

    if (bid_id) {
      formData.append("bid_id", bid_id);
    }

    // Calculate duration based on file size
    const fileSizeInMB = file.size / (1024 * 1024);
    const durationPerMB = 30000; // 30 seconds in milliseconds
    const duration = Math.max(
      10000,
      Math.min(300000, Math.round(fileSizeInMB * durationPerMB))
    ); // Min 10s, max 5min

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const artificialProgress = Math.min(
        95,
        Math.round((elapsed / duration) * 100)
      );
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: artificialProgress
      }));
    }, 1000);

    try {
      const response = await axios.post(apiUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${tokenRef.current}`
        }
      });

      clearInterval(progressInterval);
      setUploadProgress((prev) => ({
        ...prev,
        [file.name]: 100
      }));
      setUploadedFiles((prev) => ({ ...prev, [file.name]: true }));
      return response.data;
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error uploading file:", error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      displayAlert("No files selected", "warning");
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = selectedFiles.map((file) => uploadFile(file));
      const results: UploadResult[] = await Promise.all(
        uploadPromises.map((p) =>
          p
            .then((data) => ({ data }))
            .catch((error) => ({ error: error as Error }))
        )
      );

      const successCount = results.filter((result) => !result.error).length;
      const failCount = results.filter((result) => result.error).length;

      if (successCount > 0) {
        displayAlert(
          `Successfully uploaded ${successCount} file(s)`,
          "success"
        );
        posthog.capture("pdf_upload_batch_completed", {
          successCount,
          failCount,
          totalFiles: selectedFiles.length
        });

        // Call onUploadComplete immediately if there were no failures
        if (failCount === 0 && onUploadComplete) {
          onUploadComplete(selectedFiles);
        }
      }

      if (failCount > 0) {
        displayAlert(`Failed to upload ${failCount} file(s)`, "danger");
      }
    } catch (error) {
      console.error("Error in batch upload:", error);
      displayAlert("Error uploading files", "danger");
    } finally {
      setIsUploading(false);
      if (get_collections) {
        get_collections();
      }
      if (onClose) {
        onClose();
      }
    }
  };
  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <div className="selected-files">
        {selectedFiles.map((file, index) => (
          <div key={index} className="file-item">
            <div className="file-info">
              <FontAwesomeIcon
                icon={getFileIcon(file.type)}
                className="file-icon"
              />
              <span className="file-name">{file.name}</span>
            </div>
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{
                  width: `${uploadProgress[file.name] || 0}%`
                }}
              />
            </div>
            <span className="progress-text">
              {uploadProgress[file.name] || 0}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to get the appropriate icon based on file type
  const getFileIcon = (fileType: string) => {
    switch (getFileMode(fileType)) {
      case "pdf":
        return faFilePdf;
      case "word":
        return faFileWord;
      case "excel":
        return faFileExcel;
      default:
        return faFile;
    }
  };
  return (
    <div>
      <p className="description-text">{descriptionText}</p>

      <div
        className={`drop-zone ${dragActive ? "active" : ""} ${
          isUploading ? "disabled" : ""
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current.click()}
        style={{
          border: "2px dashed #cccccc",
          borderRadius: "4px",
          padding: "30px",
          textAlign: "center",
          cursor: isUploading ? "not-allowed" : "pointer",
          backgroundColor: dragActive ? "#f0f0f0" : "white",
          opacity: isUploading ? 0.6 : 1,
          transition: "all 0.3s ease"
        }}
      >
        <div className="upload-container">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            className="file-input"
            multiple
            disabled={isUploading}
          />
          <div className="upload-icon-wrapper">
            <div className="circle-background"></div>
            <FontAwesomeIcon icon={faFileArrowUp} className="upload-icon" />
          </div>
          <div className="upload-text">
            {isUploading
              ? "Upload in progress..."
              : "Click to Upload or drag and drop"}
          </div>
          <div className="upload-subtext">Maximum file size 50 MB</div>
        </div>
      </div>

      {renderSelectedFiles()}

      <div style={{ marginTop: "20px", textAlign: "right" }}>
        <Button
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
          className="upload-button"
        >
          {isUploading
            ? "Uploading..."
            : `Upload ${selectedFiles.length} File${
                selectedFiles.length !== 1 ? "s" : ""
              }`}
        </Button>
      </div>
    </div>
  );
};

export default UploadPDF;
