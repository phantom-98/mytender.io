import axios from "axios";
import { useRef, useState, useEffect } from "react";
import { useAuthUser } from "react-auth-kit";
import { API_URL, HTTP_PREFIX } from "../helper/Constants.tsx";
import withAuth from "../routes/withAuth.tsx";
import "../views/Upload.css";
import { displayAlert } from "../helper/Alert.tsx";
import TextField from "@mui/material/TextField";
import CustomTextField from "./CustomTextField.tsx";
import handleGAEvent from "../utilities/handleGAEvent.tsx";
const UploadTemplateText = () => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  const [text, setText] = useState("");
  const [profileName, setProfileName] = useState(null);
  const [textFormat, setTextFormat] = useState("plain");
  const [isUploading, setIsUploading] = useState(false);
  const [isFormFilled, setIsFormFilled] = useState(false); //

  useEffect(() => {
    // Check if any field is either null or an empty string
    const checkFormFilled = profileName && text;
    setIsFormFilled(checkFormFilled);
  }, [profileName, text]); // React to changes in these states

  const handleTextSubmit = async () => {
    const formData = new FormData();
    setIsUploading(true);
    formData.append("text", text);
    formData.append("profile_name", profileName);
    formData.append("mode", "template-text");

    if (!/^[a-zA-Z0-9_-\s]{3,}$/.test(profileName)) {
      displayAlert(
        "Headline name should only contain alphanumeric characters and be at least 3 characters long",
        "warning"
      );
      setIsUploading(false);
      return;
    }

    try {
      await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/uploadtext/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
            // The 'Content-Type': 'multipart/form-data' header will be set automatically by Axios for FormData
          }
        }
      );

      displayAlert("Upload successful", "success");
      handleGAEvent("Library", "Template Upload", "Upload Template Button");
    } catch (error) {
      console.error("Error saving:", error);
      displayAlert("Failed to save", "danger");
    } finally {
      setIsUploading(false); // Set isUploading to false when the upload ends
    }
  };

  return (
    <div className="App" style={{ textAlign: "center" }}>
      <div className="input-options-container mt-3">
        <CustomTextField
          fullWidth
          label="Template Headline"
          variant="outlined"
          value={profileName}
          className="uploader-input"
          onChange={(e) => setProfileName(e.target.value)}
        />

        <TextField
          fullWidth
          label="Paste Template Material Here..."
          variant="outlined"
          multiline
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              // Target the root of the outlined input

              fontFamily: '"Manrope", sans-serif' // Apply font family
            },
            "& .MuiInputLabel-root": {
              // Target the label of the TextField
              fontFamily: '"Manrope", sans-serif' // Apply font family to the label
            }
          }}
        />

        <button
          onClick={handleTextSubmit}
          disabled={!isFormFilled}
          className={
            isUploading
              ? "upload-button btn-disabled mb-4"
              : "upload-button mb-4"
          }
        >
          Upload Template
        </button>
      </div>
    </div>
  );
};

export default withAuth(UploadTemplateText);
