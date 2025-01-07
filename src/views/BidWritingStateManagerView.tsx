import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from "react";
import { EditorState } from "draft-js";
import { Outlet } from "react-router-dom";
import axios from "axios";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import { useAuthUser } from "react-auth-kit";
import { displayAlert } from "../helper/Alert";

export interface Document {
  name: string;
  editorState: EditorState;
  type: "qa sheet" | "execSummary" | "coverLetter";
}

export interface Subheading {
  subheading_id: string;
  title: string;
  extra_instructions: string;
  word_count: number;
}

export interface Section {
  section_id: string;
  heading: string;
  question: string;
  word_count: number;
  answer: string;
  reviewer: string;
  status: "Not Started" | "In Progress" | "Completed";
  weighting?: string;
  page_limit?: string;
  subsections: number;
  subheadings: Subheading[];
  choice: string;
  writingplan: string;
  compliance_requirements: string;
}

export interface Contributor {
  [login: string]: string; // login: permission
}

export interface SharedState {
  bidInfo: string;
  opportunity_information: string;
  compliance_requirements: string;
  questions: string;
  value: string;
  client_name: string;
  bid_qualification_result: string;
  opportunity_owner: string;
  submission_deadline: string;
  bid_manager: string;
  contributors: Contributor;
  original_creator: string;
  isSaved: boolean;
  isLoading: boolean;
  saveSuccess: boolean | null;
  object_id: string | null;
  selectedFolders: string[];
  lastUpdated?: number;
  outline: Section[];
}

export interface BidContextType {
  sharedState: SharedState;
  setSharedState: React.Dispatch<React.SetStateAction<SharedState>>;
  saveProposal: () => void;
  getBackgroundInfo: () => string;
}

const defaultState: BidContextType = {
  sharedState: {
    bidInfo: "",
    opportunity_information: "",
    compliance_requirements: "",
    questions: "",
    value: "",
    client_name: "",
    bid_qualification_result: "",
    opportunity_owner: "",
    submission_deadline: "",
    bid_manager: "",
    contributors: {},
    original_creator: "",
    isSaved: false,
    isLoading: false,
    saveSuccess: null,
    object_id: null,
    selectedFolders: ["default"],
    outline: []
  },
  setSharedState: () => {},
  saveProposal: () => {},
  getBackgroundInfo: () => ""
};

export const BidContext = createContext<BidContextType>(defaultState);

const BidManagement: React.FC = () => {
  // Create a separate ref to track if we're currently saving
  const isSavingRef = useRef(false);

  // Initialize shared state from localStorage or use default state
  const [sharedState, setSharedState] = useState<SharedState>(() => {
    try {
      const savedState = localStorage.getItem("bidState");
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Ensure outline is properly structured when loading from localStorage
        const validatedOutline = Array.isArray(parsedState.outline)
          ? parsedState.outline
          : [];

        // Combine default state with saved state, ensuring all required fields exist
        return {
          ...defaultState.sharedState, // Start with default state
          ...parsedState, // Override with saved state
          outline: validatedOutline, // Use validated outline
          contributors: parsedState.contributors || {},
          original_creator: parsedState.original_creator || "",
          isSaved: false,
          isLoading: false,
          saveSuccess: null,
          object_id: parsedState.object_id || null,
          selectedFolders: parsedState.selectedFolders || ["default"]
        };
      }
      return defaultState.sharedState;
    } catch (error) {
      console.error("Error loading state from localStorage:", error);
      return defaultState.sharedState;
    }
  });

  // Debounce timer for auto-save functionality
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Store current user's email for permission checks
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

  // Get auth token and store in ref to avoid unnecessary re-renders
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  // Utility function to combine background information
  const getBackgroundInfo = () => {
    return `${sharedState.opportunity_information}\n${sharedState.compliance_requirements}`;
  };

  // Check if current user has permission to save changes
  const canUserSave = useCallback((): boolean => {
    const userPermission = sharedState.contributors[auth.email];
    return userPermission === "admin" || userPermission === "editor";
  }, [sharedState.contributors, currentUserEmail]);

  // Main save function that sends data to the server
  const saveProposal = async () => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      console.log("Save already in progress, skipping");
      return;
    }

    // Check user permissions before proceeding
    if (!canUserSave()) {
      console.log(
        "User does not have permission to save. Skipping save operation."
      );
      return;
    }

    try {
      isSavingRef.current = true;

      // Deep copy state to prevent mutations during save operation
      const stateCopy = JSON.parse(JSON.stringify(sharedState));

      // Validate outline structure before proceeding
      if (!Array.isArray(stateCopy.outline)) {
        console.error("Invalid outline structure");
        return;
      }

      const {
        bidInfo,
        compliance_requirements,
        opportunity_information,
        bid_qualification_result,
        client_name,
        value,
        opportunity_owner,
        submission_deadline,
        bid_manager,
        contributors,
        questions,
        object_id,
        original_creator,
        outline
      } = stateCopy;

      if (!bidInfo || bidInfo.trim() === "") {
        displayAlert("Please type in a bid name...", "warning");
        return;
      }

      setSharedState((prev) => ({
        ...prev,
        isLoading: true,
        saveSuccess: null
      }));

      const backgroundInfo = getBackgroundInfo();

      const formData = new FormData();
      const appendFormData = (key: string, value: string) => {
        formData.append(key, value && value.trim() !== "" ? value : " ");
      };

      appendFormData("bid_title", bidInfo);
      appendFormData("status", "ongoing");
      appendFormData("contract_information", backgroundInfo);
      appendFormData("value", value);
      appendFormData("compliance_requirements", compliance_requirements);
      appendFormData("opportunity_information", opportunity_information);
      appendFormData("client_name", client_name);
      appendFormData("bid_qualification_result", bid_qualification_result);
      appendFormData("opportunity_owner", opportunity_owner);
      appendFormData("bid_manager", bid_manager);
      formData.append("contributors", JSON.stringify(contributors));
      appendFormData("submission_deadline", submission_deadline);
      appendFormData("questions", questions);
      appendFormData("original_creator", original_creator);
      formData.append("outline", JSON.stringify(outline));

      if (object_id) {
        appendFormData("object_id", object_id);
      }

      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/upload_bids`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const { bid_id } = response.data;

      setSharedState((prev) => ({
        ...prev,
        isSaved: true,
        isLoading: false,
        saveSuccess: true,
        object_id: bid_id
      }));

      // Update localStorage with the latest state
      localStorage.setItem(
        "bidState",
        JSON.stringify({
          ...stateCopy,
          object_id: bid_id,
          isSaved: true,
          isLoading: false,
          saveSuccess: true
        })
      );

      // Reset isSaved after 3 seconds
      setTimeout(
        () => setSharedState((prev) => ({ ...prev, isSaved: false })),
        3000
      );
    } catch (error) {
      console.error("Error saving proposal:", error);
      setSharedState((prev) => ({
        ...prev,
        isLoading: false,
        saveSuccess: false
      }));
    } finally {
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    // Skip if already saving
    if (isSavingRef.current) {
      console.log("Skipping autosave - already saving");
      return;
    }

    console.log("State change detected:", {
      bidInfo: sharedState.bidInfo,
      value: sharedState.value,
      submission_deadline: sharedState.submission_deadline,
      lastUpdated: sharedState.lastUpdated,
      isSavingRef: isSavingRef.current,
      canSave: canUserSave()
    });

    // Immediately save current state to localStorage
    const stateToSave = {
      ...sharedState,
      outline: Array.isArray(sharedState.outline) ? sharedState.outline : []
    };

    localStorage.setItem("bidState", JSON.stringify(stateToSave));
    console.log("State saved to localStorage");

    // Clear any existing save timer
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      console.log("Cleared existing save timer");
    }

    // Set new timer for auto-save
    setTypingTimeout(
      setTimeout(() => {
        if (canUserSave() && !isSavingRef.current) {
          saveProposal();
        }
      }, 2000)
    );
  }, [
    // Dependencies that trigger auto-save when changed
    sharedState.bidInfo,
    sharedState.opportunity_information,
    sharedState.compliance_requirements,
    sharedState.questions,
    sharedState.client_name,
    sharedState.bid_qualification_result,
    sharedState.opportunity_owner,
    sharedState.submission_deadline,
    sharedState.bid_manager,
    sharedState.contributors,
    sharedState.original_creator,
    sharedState.selectedFolders,
    sharedState.lastUpdated,
    JSON.stringify(
      sharedState.outline.map((s) => ({
        id: s.section_id,
        subheadingsCount: s.subheadings.length,
        subheadingsIds: s.subheadings.map((sh) => sh.subheading_id).join(",")
      }))
    ),
    // Triggers on deep changes to outline
    JSON.stringify(sharedState.outline),
    canUserSave
  ]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(
          `http${HTTP_PREFIX}://${API_URL}/profile`,
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`
            }
          }
        );
        setCurrentUserEmail(response.data.email);
      } catch (err) {
        console.log("Failed to load profile data");
      }
    };

    fetchUserData();
  }, [tokenRef]);

  return (
    <BidContext.Provider
      value={{
        sharedState,
        setSharedState,
        saveProposal,
        getBackgroundInfo
      }}
    >
      <Outlet />
    </BidContext.Provider>
  );
};

export default BidManagement;
