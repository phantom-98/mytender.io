import React, { useState, useContext } from "react";
import { Row, Col, Spinner } from "react-bootstrap";
import "./TenderAnalysis.css";
import axios from "axios";
import { displayAlert } from "../helper/Alert";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import { BidContext } from "../views/BidWritingStateManagerView";
import { useAuthUser } from "react-auth-kit";
import {
  faFileLines,
  faLightbulb,
  faStar
} from "@fortawesome/free-regular-svg-icons";
import { faScaleBalanced } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const TenderAnalysis = ({ canUserEdit }) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [loadingPrompt, setLoadingPrompt] = useState(null);
  const { sharedState, setSharedState } = useContext(BidContext);
  const getAuth = useAuthUser();
  const auth = getAuth();

  const {
    object_id,
    tender_summary,
    evaluation_criteria,
    derive_insights,
    differentiation_opportunities
  } = sharedState;

  const [tabContent, setTabContent] = useState({
    0: tender_summary || "",
    1: evaluation_criteria || "",
    2: derive_insights || "",
    3: differentiation_opportunities || ""
  });

  const tabs = [
    "Summarise Tender",
    "Evaluation Criteria",
    "Derive Insights",
    "Differentiation Opportunities"
  ];

  const actionButtons = [
    {
      icon: faFileLines,
      label: "Ask to summarise",
      prompt: "generate_summarise_tender",
      stateKey: "tender_summary"
    },
    {
      icon: faScaleBalanced,
      label: "Ask to evaluate",
      prompt: "generate_evaluation_criteria",
      stateKey: "evaluation_criteria"
    },
    {
      icon: faLightbulb,
      label: "Ask for insights",
      prompt: "generate_derive_insights",
      stateKey: "derive_insights"
    },
    {
      icon: faStar,
      label: "Ask to differentiate",
      prompt: "generate_differentiation_opportunities",
      stateKey: "differentiation_opportunities"
    }
  ];

  const getPlaceholderText = (index) => {
    const placeholders = {
      0: "Enter tender summary here...",
      1: "Document evaluation criteria...",
      2: "Note key insights...",
      3: "List differentiation opportunities..."
    };
    return placeholders[index];
  };

  const handleTextChange = (event) => {
    const newContent = event.target.value;

    setTabContent((prev) => ({
      ...prev,
      [currentTabIndex]: newContent
    }));

    const stateKeys = {
      0: "tender_summary",
      1: "evaluation_criteria",
      2: "derive_insights",
      3: "differentiation_opportunities"
    };

    setSharedState((prev) => ({
      ...prev,
      [stateKeys[currentTabIndex]]: newContent
    }));
  };

  const handleActionClick = async (action, prompt) => {
    if (!canUserEdit) {
      displayAlert("You only have permission to view this bid.", "danger");
      return;
    }

    if (!object_id) {
      displayAlert("Please save the bid first.", "warning");
      return;
    }

    setLoadingPrompt(prompt);
    const formData = new FormData();
    formData.append("bid_id", object_id);
    formData.append("prompt", prompt);

    try {
      const result = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/generate_tender_insights`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${auth?.token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const clickedButton = actionButtons.find((btn) => btn.prompt === prompt);
      if (!clickedButton) return;

      const generatedContent = result.data.requirements;
      const tabIndex = actionButtons.findIndex((btn) => btn.prompt === prompt);
      if (tabIndex === -1) return;

      setTabContent((prev) => ({
        ...prev,
        [tabIndex]: generatedContent
      }));

      setSharedState((prev) => ({
        ...prev,
        [clickedButton.stateKey]: generatedContent
      }));

      setCurrentTabIndex(tabIndex);
      displayAlert("Generated successfully!", "success");
    } catch (err) {
      console.error("Error generating:", err);
      if (err.response?.status === 404) {
        displayAlert(
          "No documents found in the tender library. Please upload documents before generating",
          "warning"
        );
      } else {
        displayAlert(
          "An error occurred while generating. Please try again.",
          "danger"
        );
      }
    } finally {
      setLoadingPrompt(null);
    }
  };

  return (
    <div className="tender-analysis">
      <div className="action-buttons">
        {actionButtons.map((button, index) => (
          <button
            key={index}
            onClick={() => handleActionClick(button.label, button.prompt)}
            className="action-button"
            disabled={loadingPrompt !== null}
          >
            {loadingPrompt === button.prompt ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <FontAwesomeIcon icon={button.icon} />
                <span>{button.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
      <div className="tabs-container">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`tab ${currentTabIndex === index ? "active" : ""}`}
            onClick={() => setCurrentTabIndex(index)}
          >
            <span className="tab-content">
              <span className="tab-name">{tab}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="proposal-container">
       
            <textarea
              className="tender-insights-textarea"
              value={tabContent[currentTabIndex]}
              onChange={handleTextChange}
              placeholder={getPlaceholderText(currentTabIndex)}
              disabled={!canUserEdit}/>
         
     
      </div>
    </div>
  );
};

export default TenderAnalysis;
