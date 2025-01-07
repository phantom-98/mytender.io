import React, { useContext, useEffect, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import BidNavbar from "../routes/BidNavbar.tsx";
import "./BidExtractor.css";
import {
  BidContext,
  Section,
  Subheading
} from "./BidWritingStateManagerView.tsx";
import { displayAlert } from "../helper/Alert.tsx";
import "./ProposalPlan.css";
import { Link, useNavigate } from "react-router-dom";
import StatusMenu from "../buttons/StatusMenu.tsx";
import OutlineInstructionsModal from "../modals/OutlineInstructionsModal.tsx";
import SectionMenu from "../buttons/SectionMenu.tsx";
import posthog from "posthog-js";
import { Button, Form, Row, Spinner } from "react-bootstrap";
import ProposalSidepane from "../components/SlidingSidepane.tsx";
import ReviewerDropdown from "../components/dropdowns/ReviewerDropdown.tsx";
import QuestionTypeDropdown from "../components/dropdowns/QuestionTypeDropdown.tsx";
import SectionControls from "../buttons/SectionControls.tsx";

const ProposalPlan = () => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const navigate = useNavigate();
  const tokenRef = useRef(auth?.token || "default");
  const { sharedState, setSharedState } = useContext(BidContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [questionAsked, setQuestionAsked] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [apiChoices, setApiChoices] = useState([]);
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [wordAmounts, setWordAmounts] = useState({});
  const [broadness, setBroadness] = useState("4");
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number | null>(
    null
  );

  const { object_id, contributors, outline } = sharedState;

  const currentUserPermission = contributors[auth.email] || "viewer";
  const [showModal, setShowModal] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );

  const [selectedSection, setSelectedSection] = useState(null);
  const [isSidepaneOpen, setIsSidepaneOpen] = useState(false);

  const handleRowClick = (e: React.MouseEvent, index: number) => {
    const isInteractiveElement = (e.target as HTMLElement).closest(
      'input, select, button, a, .MuiSelect-select, [role="button"], .editable-cell'
    );

    if (!isInteractiveElement) {
      e.preventDefault();
      setSelectedSection(index);
      setIsSidepaneOpen(true);
      setApiChoices([]);
    }
  };

  // Add these types and functions to your ProposalPlan component:
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;

    setSharedState((prevState) => {
      const newOutline = [...prevState.outline];
      const [movedItem] = newOutline.splice(index, 1);
      newOutline.splice(newIndex, 0, movedItem);

      return {
        ...prevState,
        outline: newOutline
      };
    });
  };

  // Add this function to handle toggling sections
  const toggleSection = (index: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleContextMenu = (e, index) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setSelectedRowIndex(index);
  };

  const handleClickOutside = (e) => {
    if (contextMenu && !e.target.closest(".context-menu")) {
      setContextMenu(null);
      setSelectedRowIndex(null);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  useEffect(() => {
    fetchOutline();
  }, []);

  const handleAddSection = async () => {
    if (!object_id || selectedRowIndex === null) return;

    const newSection = {
      heading: "New Section",
      word_count: 0,
      reviewer: "",
      status: "Not Started" as const,
      subsections: 0,
      question: "",
      answer: "",
      weighting: "",
      page_limit: "",
      subheadings: [],
      choice: "3b",
      writingplan: ""
    };

    try {
      const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );

      const updatedOutline = [...sharedState.outline];
      updatedOutline.splice(selectedRowIndex, 0, {
        ...newSection,
        section_id: uuid
      });

      setSharedState((prevState) => ({
        ...prevState,
        outline: updatedOutline
      }));
    } catch (err) {
      console.error("Error adding section:", err);
      displayAlert("Failed to add section", "danger");
    }
    setContextMenu(null);
  };

  const handleDeleteSection = async (
    sectionId: string,
    sectionIndex: number
  ) => {
    try {
      posthog.capture("proposal_section_delete_started", {
        bidId: object_id,
        sectionId,
        sectionIndex
      });

      await deleteSection(sectionId, sectionIndex);
    } catch (err) {
      console.log(err);
      posthog.capture("proposal_section_delete_failed", {
        bidId: object_id,
        sectionId,
        error: err.message
      });
    }
  };

  const handleEditClick = async (section: Section, index: number) => {
    try {
      // Use preview-specific loading state
      posthog.capture("proposal_section_edit", {
        bidId: object_id,
        sectionId: section.section_id,
        sectionHeading: section.heading
      });

      const selectedChoices =
        section.subheadings.length > 0
          ? section.subheadings.map((subheading) => subheading.title)
          : [section.heading];

      const wordAmount = section.word_count;

      // If no subheadings, use empty array for compliance requirements
      const compliance_requirements =
        section.subheadings.length > 0
          ? section.subheadings.map(
              (subheading) => section.compliance_requirements
            )
          : [""];

      const answer = await sendQuestionToChatbot(
        section.question,
        section.writingplan || "",
        index,
        section.choice,
        selectedChoices,
        wordAmount || 250,
        compliance_requirements
      );

      // Update state and wait for it to complete
      await new Promise<void>((resolve) => {
        setSharedState((prevState) => {
          const newOutline = [...prevState.outline];
          newOutline[index] = {
            ...newOutline[index],
            answer: answer
          };

          setTimeout(resolve, 0);
          return {
            ...prevState,
            outline: newOutline
          };
        });
      });
    } catch (error) {
      console.error("Error in handleEditClick:", error);
      displayAlert("Failed to update section", "danger");
    }
  };

  const showViewOnlyMessage = () => {
    displayAlert("You only have permission to view this bid.", "danger");
  };

  useEffect(() => {
    if (outline.length === 0) {
      setShowModal(true);
    }
  }, [outline.length]);

  const handleRegenerateClick = () => {
    setShowModal(true);
  };

  const deleteSection = async (sectionId: string, sectionIndex: number) => {
    try {
      const updatedOutline = [...sharedState.outline];
      updatedOutline.splice(sectionIndex, 1);

      setSharedState((prevState) => ({
        ...prevState,
        outline: updatedOutline
      }));

      displayAlert("Section deleted successfully", "success");
    } catch (err) {
      console.error("Error deleting section:", err);
      displayAlert("Failed to delete section", "danger");
    }
  };

  const handleDeleteClick = (section: Section, index: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this section? This action cannot be undone."
      )
    ) {
      deleteSection(section.section_id, index);
    }
  };

  const handleDeleteSubheading = (
    sectionIndex: number,
    subheadingIndex: number
  ) => {
    const newOutline = [...outline];

    // Filter out the deleted subheading
    newOutline[sectionIndex].subheadings = newOutline[
      sectionIndex
    ].subheadings.filter((_, idx) => idx !== subheadingIndex);

    // Update the subsections count to match the new number of subheadings
    newOutline[sectionIndex] = {
      ...newOutline[sectionIndex],
      subsections: newOutline[sectionIndex].subheadings.length
    };

    setSharedState((prevState) => ({
      ...prevState,
      outline: newOutline
    }));
  };

  const handleSectionChange = async (
    index: number,
    field: keyof Section,
    value: any
  ) => {
    try {
      // Create new outline by properly spreading nested objects
      const newOutline = [...sharedState.outline];
      newOutline[index] = {
        ...newOutline[index],
        [field]: value
      };

      // Update state using callback to ensure we have latest state
      setSharedState((prevState) => ({
        ...prevState,
        outline: newOutline
      }));

      // Wait for state to update
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Track status changes
      if (field === "status") {
        posthog.capture("proposal_section_status_changed", {
          bidId: object_id,
          sectionIndex: index,
          newStatus: value
        });
      }

      // Track answer changes
      if (field === "answer") {
        posthog.capture("proposal_section_answer_updated", {
          bidId: object_id,
          sectionIndex: index,
          answerLength: value.length
        });
      }

      return true; // Indicate successful update
    } catch (error) {
      console.error("Error updating section:", error);
      displayAlert("Failed to update section", "danger");
      return false;
    }
  };

  const handleSectionNavigation = (direction: "prev" | "next") => {
    console.log("clicked", selectedSection);
    if (selectedSection === null) return; // Changed condition to check for null specifically

    setApiChoices([]);
    console.log("change section");
    const newIndex =
      direction === "prev" ? selectedSection - 1 : selectedSection + 1;

    if (newIndex >= 0 && newIndex < outline.length) {
      setSelectedSection(newIndex);
    }
  };
  const fetchOutline = async () => {
    if (!object_id) return;
    const formData = new FormData();
    formData.append("bid_id", object_id);
    setIsLoading(true);
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_bid_outline`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const outlineWithStatus = response.data.map((section: any) => ({
        ...section,
        status:
          section.status ||
          (section.completed
            ? "Completed"
            : section.in_progress
              ? "In Progress"
              : "Not Started")
      }));

      setSharedState((prevState) => ({
        ...prevState,
        outline: outlineWithStatus
      }));
    } catch (err) {
      console.error("Error fetching outline:", err);
      displayAlert("Failed to fetch outline", "danger");
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuestionToChatbot = async (
    inputText: string,
    backgroundInfo: string,
    sectionIndex: number,
    choice: string,
    selectedChoices?: string[],
    wordAmount?: number,
    compliance_requirements?: string[]
  ) => {
    setCurrentSectionIndex(sectionIndex);
    setQuestionAsked(true);
    localStorage.setItem("questionAsked", "true");
    setStartTime(Date.now());
    setElapsedTime(0);
    setApiChoices([]);

    console.log("question");
    console.log(choice);
    console.log(broadness);
    console.log(inputText);
    console.log(backgroundInfo);
    console.log(sharedState.selectedFolders);
    console.log(sharedState.object_id);

    try {
      // Build request body based on choice
      const requestBody: any = {
        choice: choice,
        broadness: broadness,
        input_text: inputText,
        extra_instructions: backgroundInfo,
        datasets: sharedState.selectedFolders,
        bid_id: sharedState.object_id
      };

      // Only include selectedChoices and wordAmounts if choice is not "3a"
      if (choice !== "3a") {
        setIsPreviewLoading(true);
        if (selectedChoices) {
          requestBody.selected_choices = selectedChoices;
        }
        if (wordAmounts) {
          requestBody.word_amount = wordAmount;
        }
        if (wordAmounts) {
          requestBody.compliance_requirements = compliance_requirements;
          console.log("compliance");
          console.log(compliance_requirements);
        }
      } else {
        setIsLoading(true);
      }

      const result = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/question`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );

      console.log("Received response:", result.data);

      if (choice === "3a") {
        let choicesArray = [];
        try {
          if (result.data && result.data.includes(";")) {
            choicesArray = result.data
              .split(";")
              .map((choice) => choice.trim());
          }
          if (choicesArray.length === 0 && typeof result.data === "string") {
            choicesArray = result.data
              .split("\n")
              .filter((line) => /^\d+\./.test(line.trim()))
              .map((line) => line.replace(/^\d+\.\s*/, "").trim());
          }
          console.log("Parsed choices:", choicesArray);
          if (choicesArray.length === 0) {
            throw new Error("Failed to parse API response into choices");
          }
        } catch (error) {
          console.error("Error processing API response:", error);
        }
        setApiChoices(choicesArray);
      } else {
        return result.data;
      }
    } catch (error) {
      console.error("Error sending question:", error);
      throw error;
    } finally {
      setIsLoading(false);
      setIsPreviewLoading(false);
      setStartTime(null);
    }
  };

  const handleChoiceSelection = (selectedChoice) => {
    if (selectedChoices.includes(selectedChoice)) {
      setSelectedChoices(
        selectedChoices.filter((choice) => choice !== selectedChoice)
      );
      setWordAmounts((prevWordAmounts) => {
        const newWordAmounts = { ...prevWordAmounts };
        delete newWordAmounts[selectedChoice];
        return newWordAmounts;
      });
    } else {
      setSelectedChoices([...selectedChoices, selectedChoice]);
      setWordAmounts((prevWordAmounts) => ({
        ...prevWordAmounts,
        [selectedChoice]: 100 // Default word amount
      }));
    }
  };

  const renderChoices = () => {
    return (
      <div className="choices-container ms-2">
        {apiChoices
          .filter((choice) => choice && choice.trim() !== "") // Filter out empty or whitespace-only choices
          .map((choice, index) => (
            <div key={index} className="choice-item d-flex align-items-center">
              <Form.Check
                type="checkbox"
                checked={selectedChoices.includes(choice)}
                onChange={() => handleChoiceSelection(choice)}
              />
              {selectedChoices.includes(choice) ? (
                <Form.Control
                  type="text"
                  value={choice}
                  onChange={(e) => handleChoiceEdit(index, e.target.value)}
                  className="ml-2"
                />
              ) : (
                <span
                  onClick={() => handleChoiceSelection(choice)}
                  style={{ cursor: "pointer" }}
                >
                  {choice}
                </span>
              )}
            </div>
          ))}
      </div>
    );
  };

  const handleChoiceEdit = (index, newValue) => {
    const updatedChoices = [...apiChoices];
    updatedChoices[index] = newValue;
    setApiChoices(updatedChoices);

    // Update selectedChoices and wordAmounts if the edited choice was selected
    if (selectedChoices.includes(apiChoices[index])) {
      const updatedSelectedChoices = selectedChoices.map((choice) =>
        choice === apiChoices[index] ? newValue : choice
      );
      setSelectedChoices(updatedSelectedChoices);

      const updatedWordAmounts = { ...wordAmounts };
      if (updatedWordAmounts[apiChoices[index]]) {
        updatedWordAmounts[newValue] = updatedWordAmounts[apiChoices[index]];
        delete updatedWordAmounts[apiChoices[index]];
      }
      setWordAmounts(updatedWordAmounts);
    }
  };

  const submitSelections = async () => {
    setIsLoading(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    try {
      console.log("Starting submitSelections with choices:", selectedChoices);

      // Generate UUID for each subheading
      const generateUUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      // Convert selected choices into subheadings format with all required properties
      const newSubheadings: Subheading[] = selectedChoices.map((choice) => ({
        title: choice,
        word_count: parseInt(wordAmounts[choice] || "100"),
        content: "",
        subheading_id: generateUUID(),
        extra_instructions: "" // Add default value for extra_instructions
      }));

      // Get the current section and update its subheadings
      setSharedState((prevState) => {
        const newOutline = [...prevState.outline];

        if (currentSectionIndex !== null && currentSectionIndex >= 0) {
          // If section already has subheadings, append new ones
          const existingSubheadings =
            newOutline[currentSectionIndex].subheadings || [];
          newOutline[currentSectionIndex] = {
            ...newOutline[currentSectionIndex],
            subheadings: [...existingSubheadings, ...newSubheadings],
            subsections: existingSubheadings.length + newSubheadings.length
          };
        }

        return {
          ...prevState,
          outline: newOutline
        };
      });

      // Reset selection state
      setApiChoices([]);
      setSelectedChoices([]);
      setWordAmounts({});
    } catch (error) {
      console.error("Error submitting selections:", error);
      displayAlert("Error generating responses", "danger");
    } finally {
      setIsLoading(false);
      setStartTime(null);
    }
  };

  return (
    <div className="chatpage">
      <SideBarSmall />
      <div className="lib-container">
        <div className="scroll-container">
          <BidNavbar
            showViewOnlyMessage={showViewOnlyMessage}
            initialBidName={"initialBidName"}
            outline={outline}
            object_id={object_id}
            handleRegenerateClick={handleRegenerateClick}
          />
          <OutlineInstructionsModal
            show={showModal}
            onHide={() => setShowModal(false)}
            bid_id={object_id}
            fetchOutline={fetchOutline}
          />

          {outline.length === 0 ? (
            <div></div>
          ) : (
            <div>
              <div className="table-responsive mt-3">
                <table
                  className="outline-table"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead>
                    <tr>
                      <th className="section-col">Section</th>
                      <th
                        className="dropdown-col"
                        style={{ width: "250px", minWidth: "250px" }}
                      >
                        Reviewer
                      </th>
                      <th
                        className="dropdown-col"
                        style={{ width: "250px", minWidth: "250px" }}
                      >
                        Question Type
                      </th>
                      <th
                        className="dropdown-col text-center"
                        style={{ width: "140px", minWidth: "140px" }}
                      >
                        Completed
                      </th>
                      <th className="text-center" style={{ width: "120px" }}>
                        Subsections
                      </th>
                      <th className="text-center" style={{ width: "130px" }}>
                        Words
                      </th>
                      <th
                        className="text-center"
                        style={{ width: "60px" }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {outline.map((section, index) => {
                      const isExpanded = expandedSections.has(index);
                      return (
                        <React.Fragment key={index}>
                          <tr
                            onContextMenu={(e) => handleContextMenu(e, index)}
                            onClick={(e) => handleRowClick(e, index)}
                            className="hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="">
                              <div className="flex items-center gap-2">
                                <Link
                                  to="#"
                                  className="bg-transparent border-0 cursor-pointer text-black me-2"
                                  onClick={() => toggleSection(index)}
                                ></Link>
                                <span>{section.heading}</span>
                              </div>
                            </td>
                            <td className="">
                              <ReviewerDropdown
                                value={section.reviewer}
                                onChange={(value) =>
                                  handleSectionChange(index, "reviewer", value)
                                }
                                contributors={contributors}
                              />
                            </td>
                            <td className="">
                              <QuestionTypeDropdown
                                value={section.choice}
                                onChange={(value) =>
                                  handleSectionChange(index, "choice", value)
                                }
                              />
                            </td>
                            <td className="text-center">
                              <StatusMenu
                                value={section.status}
                                onChange={(value) => {
                                  handleSectionChange(index, "status", value);
                                }}
                              />
                            </td>
                            <td className="text-center">
                              {section.subsections}
                            </td>
                            <td className="text-center">
                              <input
                                type="number"
                                value={section.word_count || 0}
                                min="0"
                                step="50"
                                className="form-control d-inline-block word-count-input"
                                style={{
                                  width: "110px",
                                  textAlign: "center"
                                }}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!isNaN(value) && value >= 0) {
                                    handleSectionChange(
                                      index,
                                      "word_count",
                                      value
                                    );
                                  }
                                }}
                              />
                            </td>

                            <td className="text-center">
                              <div className="d-flex justify-content-center pe-2">
                                <SectionControls
                                  onDelete={() =>
                                    handleDeleteClick(section, index)
                                  }
                                  onMoveDown={() =>
                                    handleMoveSection(index, "down")
                                  }
                                  onMoveUp={() =>
                                    handleMoveSection(index, "up")
                                  }
                                  isFirst={index === 0}
                                  isLast={index === outline.length - 1}
                                />
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {contextMenu && (
                <SectionMenu
                  x={contextMenu.x}
                  y={contextMenu.y}
                  onClose={() => setContextMenu(null)}
                  onAddSection={handleAddSection}
                  onDeleteSection={handleDeleteSection}
                />
              )}
              {selectedSection !== null && (
                <ProposalSidepane
                  section={outline[selectedSection]}
                  contributors={contributors}
                  index={selectedSection}
                  isOpen={isSidepaneOpen}
                  onClose={() => {
                    setIsSidepaneOpen(false);
                    setSelectedSection(null);
                  }}
                  isLoading={isLoading}
                  isPreviewLoading={isPreviewLoading}
                  handleEditClick={handleEditClick}
                  handleSectionChange={handleSectionChange}
                  sendQuestionToChatbot={sendQuestionToChatbot}
                  apiChoices={apiChoices}
                  renderChoices={renderChoices}
                  selectedChoices={selectedChoices}
                  submitSelections={submitSelections}
                  handleDeleteSubheading={handleDeleteSubheading}
                  totalSections={outline.length} // Add this
                  onNavigate={handleSectionNavigation} // Add this
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(ProposalPlan);
