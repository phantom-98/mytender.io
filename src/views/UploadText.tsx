import axios from "axios";
import { useRef, useState, useEffect } from "react";
import { useAuthUser } from "react-auth-kit";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import withAuth from "../routes/withAuth";
import "./Upload.css";
import { displayAlert } from "../helper/Alert";
import CustomTextField from "../components/CustomTextField";
import TextField from "@mui/material/TextField";
import handleGAEvent from "../utilities/handleGAEvent";
import { Spinner } from "react-bootstrap"; // Import Spinner component

const UploadText = ({ folder, get_collections, onClose }) => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  const [text, setText] = useState("");
  const [profileName, setProfileName] = useState(folder || "default");
  const [fileName, setFileName] = useState("");
  const [textFormat, setTextFormat] = useState("plain");
  const [isUploading, setIsUploading] = useState(false);
  const [isFormFilled, setIsFormFilled] = useState(false);

  useEffect(() => {
    // Check if any field is either null or an empty string
    const checkFormFilled = profileName && fileName && text;
    setIsFormFilled(checkFormFilled);
  }, [profileName, fileName, text]); // React to changes in these states

  const handleTextSubmit = async () => {
    const formData = new FormData();
    setIsUploading(true);

    const trimmedProfileName = profileName.trim(); // Remove leading and trailing spaces
    const formattedProfileName = trimmedProfileName.replace(/\s+/g, "_");

    const trimmedFileName = fileName.trim(); // Remove leading and trailing spaces
    const formattedFileName = trimmedFileName.replace(/\s+/g, "_");

    formData.append("text", text);
    formData.append("filename", formattedFileName);
    formData.append("profile_name", formattedProfileName);
    formData.append("mode", textFormat);

    if (!/^[a-zA-Z0-9_-]{3,63}$/.test(formattedProfileName)) {
      displayAlert(
        "Folder name should be 3-63 characters long and contain only alphanumeric characters, underscores, or dashes",
        "warning"
      );
      setIsUploading(false);
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,63}$/.test(formattedFileName)) {
      displayAlert(
        "File name should be 3-63 characters long and contain only alphanumeric characters, underscores, or dashes",
        "warning"
      );
      setIsUploading(false);
      return;
    }

    if (text.length < 30) {
      displayAlert("Minimum input text is 30 characters", "warning");
      setIsUploading(false);
      return;
    }

    try {
      await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/uploadtext/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${tokenRef.current}` // Adding the token in the request headers
          }
        }
      );

      displayAlert("Upload successful", "success");
      onClose();
      get_collections();
      handleGAEvent("Library", "Text Upload", "Upload Text Button");
    } catch (error) {
      console.error("Error saving strategy:", error);

      if (error.response && error.response.status === 409) {
        displayAlert(
          "A file with this name already exists in this folder",
          "danger"
        );
      } else {
        displayAlert("Failed to save", "danger");
      }
    } finally {
      setIsUploading(false); // Set isUploading to false when the upload ends
    }
  };

  const formatDisplayName = (name) => {
    return name.replace(/_/g, " ").replace(/FORWARDSLASH/g, "/");
  };

  // Updated function to reverse the formatting
  const reverseFormatDisplayName = (name) => {
    return name.replace(/\s+/g, "_").replace(/\//g, "FORWARDSLASH");
  };

  return (
    <div className="App" style={{ textAlign: "left" }}>
      <div className="input-options-container">
        <CustomTextField
          fullWidth
          label="Folder"
          variant="outlined"
          value={formatDisplayName(profileName)}
          onChange={(e) =>
            setProfileName(reverseFormatDisplayName(e.target.value))
          }
          disabled={!!folder}
          inputProps={{ maxLength: 50 }}
        />
        <CustomTextField
          fullWidth
          label="File name"
          variant="outlined"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          inputProps={{ maxLength: 50 }} // Set character limit for file name
        />
        <TextField
          fullWidth
          label="Paste Bid Material Here.."
          variant="outlined"
          multiline
          rows={10} // Adjust the number of rows to increase the height
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontFamily: '"Manrope", sans-serif'
            },
            "& .MuiInputLabel-root": {
              fontFamily: '"Manrope", sans-serif'
            }
          }}
        />

        <button
          onClick={handleTextSubmit}
          disabled={!isFormFilled || isUploading} // Disable button if form is not filled or uploading
          className="upload-button"
        >
          {isUploading ? (
            <Spinner animation="border" size="sm" /> // Display spinner while uploading
          ) : (
            "Upload Data"
          )}
        </button>
      </div>
    </div>
  );
};

export default withAuth(UploadText);
