import React, { useState, useEffect } from "react";
import "./FileUploader.css";
import CustomTextField from "./CustomTextField";
import { displayAlert } from "../helper/Alert";
import { Spinner } from "react-bootstrap"; // Import Spinner component

const FileUploader = ({
  onFileSelect,
  folder,
  onClose,
  usingTenderLibrary = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [profileName, setProfileName] = useState(folder || "default");
  const [isFormFilled, setIsFormFilled] = useState(false);
  const [fileToUpload, setfileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false); // New state for loading

  useEffect(() => {
    const checkFormFilled = profileName && selectedFile;
    setIsFormFilled(checkFormFilled);
  }, [profileName, selectedFile]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (isFormFilled && selectedFile && profileName) {
      const trimmedProfileName = profileName.trim(); // Remove leading and trailing spaces
      const formattedProfileName = trimmedProfileName.replace(/\s+/g, "_");
      if (!/^[a-zA-Z0-9_-]{3,}$/.test(formattedProfileName)) {
        displayAlert(
          "Folder name should only contain alphanumeric characters, underscores, dashes and be at least 3 characters long",
          "warning"
        );
        return;
      }

      setIsUploading(true); // Set loading state to true

      onFileSelect(selectedFile, profileName)
        .then(() => {
          setIsUploading(false); // Set loading state to false after upload
          displayAlert("Upload successful", "success");
          setSelectedFile(null);
          setProfileName(folder || "default");
          onClose();
        })
        .catch(() => {
          setIsUploading(false); // Set loading state to false in case of an error
          displayAlert("Upload failed", "danger");
        });
    }
  };

  const formatDisplayName = (name) => {
    return name.replace(/_/g, " ").replace(/FORWARDSLASH/g, "/");
  };

  // Function to reverse the formatting
  const reverseFormatDisplayName = (name) => {
    return name.replace(/\s+/g, "_").replace(/\//g, "FORWARDSLASH");
  };

  return (
    <div className={`file-uploader ${dragActive ? "active" : ""}`}>
      {!usingTenderLibrary && (
        <CustomTextField
          fullWidth
          label="Folder"
          variant="outlined"
          value={formatDisplayName(profileName)}
          onChange={(e) =>
            setProfileName(reverseFormatDisplayName(e.target.value))
          }
          disabled={!!folder}
          className="uploader-input mb-3"
        />
      )}
      <div
        className="drop-zone"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          accept=".pdf,.docx"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="upload-label">
          Drag and drop your PDF or Word document here or click to select a
          file.
        </label>
      </div>
      {selectedFile && (
        <div>
          <h4 className="mt-3">Selected File</h4>
          <p>{selectedFile.name}</p>
          <button
            onClick={handleUpload}
            disabled={!isFormFilled || isUploading}
            className="upload-button"
          >
            {isUploading ? (
              <Spinner animation="border" size="sm" /> // Display spinner while uploading
            ) : (
              "Upload Data"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
