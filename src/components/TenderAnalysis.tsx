import React, { useState } from "react";
import { Row, Col } from "react-bootstrap";
import CustomEditor from "../components/TextEditor";
import "./TenderAnalysis.css";

const TenderAnalysis = ({ canUserEdit }) => {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [tabContent, setTabContent] = useState({
    0: "", // Summarise Tender
    1: "", // Evaluation Criteria
    2: "", // Derive Insights
    3: "" // Differentiation Opportunities
  });

  const tabs = [
    "Summarise Tender",
    "Evaluation Criteria",
    "Derive Insights",
    "Differentiation Opportunities"
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

  const handleEditorChange = (editorState, tabIndex) => {
    setTabContent((prev) => ({
      ...prev,
      [tabIndex]: editorState
    }));
  };

  return (
    <div>
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
        <Row className="justify-content-md-center">
          <Col md={12}>
            <CustomEditor
              disabled={!canUserEdit}
              editorState={tabContent[currentTabIndex]}
              setEditorState={(editorState) =>
                handleEditorChange(editorState, currentTabIndex)
              }
              placeholder={getPlaceholderText(currentTabIndex)}
            />
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default TenderAnalysis;
