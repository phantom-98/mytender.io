import React, { useContext, useEffect, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import handleGAEvent from "../utilities/handleGAEvent";
import {
  Button,
  Col,
  Form,
  Row,
  Spinner
} from "react-bootstrap";
import BidNavbar from "../routes/BidNavbar.tsx";
import "./QuestionsCrafter.css";
import FolderLogic from "../components/Folders.tsx";
import {
  Editor,
  EditorState,
  Modifier,
  SelectionState,
  convertToRaw,
  ContentState,
} from "draft-js";
import "draft-js/dist/Draft.css";
import { BidContext } from "./BidWritingStateManagerView.tsx";
import QuestionCrafterWizard from "../wizards/QuestionCrafterWizard.tsx";
import SelectFolderModal from "../components/SelectFolderModal.tsx";
import SaveQASheet from "../modals/SaveQASheet.tsx";
import { useLocation } from "react-router-dom";
import BidTitle from "../components/BidTitle.tsx";
import { displayAlert } from "../helper/Alert.tsx";

const QuestionCrafter = () => {
  const getAuth = useAuthUser();
  const auth = getAuth();
  const tokenRef = useRef(auth?.token || "default");

  const location = useLocation();
  const { section, bid_id } = location.state;
  
  const { sharedState, setSharedState, getBackgroundInfo } =
    useContext(BidContext);
  const { contributors } = sharedState;

  const backgroundInfo = getBackgroundInfo();

  const [availableCollections, setAvailableCollections] = useState([]);
  const [folderContents, setFolderContents] = useState({});
  const [inputText, setInputText] = useState(
    localStorage.getItem("inputText") || section.question || ""
  );
  const [responseEditorState, setResponseEditorState] = useState(
    EditorState.createWithContent(
      ContentState.createFromText(localStorage.getItem("response") || "")
    )
  );
  const [contentLoaded, setContentLoaded] = useState(true); // Set to true initially

  const currentUserPermission = contributors[auth.email] || "viewer"; // Default to 'viewer' if not found
  const canUserEdit =
    currentUserPermission === "admin" || currentUserPermission === "editor";

  const [selectedFolders, setSelectedFolders] = useState(["default"]);

  


  const showViewOnlyMessage = () => {
    displayAlert("You only have permission to view this bid.", "danger");
  };

  
  const handleSaveSelectedFolders = (folders) => {
    console.log("Received folders in parent:", folders);
    setSelectedFolders(folders);
  };
  useEffect(() => {
    console.log(
      "selectedFolders state in QuestionCrafter updated:",
      selectedFolders
    );
  }, [selectedFolders]);


  /////////////////////////////////////////////////////////////////////////////////////////////

 
  const [choice, setChoice] = useState("3");
  const [broadness, setBroadness] = useState("4");

  const [isLoading, setIsLoading] = useState(false);
  const [questionAsked, setQuestionAsked] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState([]);
  const [apiChoices, setApiChoices] = useState([]);
  const [wordAmounts, setWordAmounts] = useState({});

  const [subheadings, setSubheadings] = useState<Subheading[]>([]);
  const [answerSections, setAnswerSections] = useState<AnswerSection[]>([]);
  const [isLoadingSubheadings, setIsLoadingSubheadings] = useState(false);
  // Add a new effect specifically for handling references when answerSections change
  useEffect(() => {
    if (answerSections.length > 0) {
      console.log("Making references bold for sections:", answerSections.length);
      setAnswerSections(prev => 
        prev.map(section => {
          console.log(`Processing references for section: ${section.title}`);
          const currentText = convertToRaw(section.editorState.getCurrentContent())
            .blocks.map(block => block.text)
            .join('\n');
          console.log(`Current text contains references:`, currentText.includes('[Extracted'));
          
          return {
            ...section,
            editorState: makeReferencesBoldForState(section.editorState)
          };
        })
      );
    }
  }, [answerSections.length]); // Only run when the number of sections changes

  // Update the fetchSubheadings function to handle references after setting state
  const fetchSubheadings = async () => {
    setIsLoadingSubheadings(true);
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_subheadings`,
        {
          bid_id: bid_id,
          section_id: section.section_id
        },
        {
          headers: {
            'Authorization': `Bearer ${tokenRef.current}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      setSubheadings(response.data.subheadings);
      
      // Initialize answer sections and make references bold immediately
      const newAnswerSections = response.data.subheadings.map((sh: Subheading) => {
        const initialState = EditorState.createWithContent(
          ContentState.createFromText(sh.body || '')
        );
        // Make references bold right away
        return {
          subheading_id: sh.subheading_id,
          title: sh.title,
          editorState: makeReferencesBoldForState(initialState)
        };
      });
      
      console.log("Setting new answer sections with bold references");
      setAnswerSections(newAnswerSections);
      
    } catch (error) {
      console.error('Error fetching subheadings:', error);
      displayAlert("Failed to fetch subheadings", 'danger');
    } finally {
      setIsLoadingSubheadings(false);
    }
  };

  // Fetch subheadings when component mounts or when section changes
  useEffect(() => {
    if (section?.section_id) {
      fetchSubheadings();
    }
  }, [section]);

  useEffect(() => {
    let timer;
    if (isLoading && startTime) {
      timer = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setElapsedTime(elapsed);
      }, 100); // Update every 100ms
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isLoading, startTime]);


  const sendQuestionToChatbot = async () => {
    handleGAEvent("Chatbot", "Submit Question", "Submit Button");
    setQuestionAsked(true);
    localStorage.setItem("questionAsked", "true");
    setIsLoading(true);
    setStartTime(Date.now());
    setElapsedTime(0);

    console.log("Starting question request with:", {
      inputText,
      backgroundInfo,
      selectedFolders
    });

    try {
        const result = await axios.post(
          `http${HTTP_PREFIX}://${API_URL}/question`,
          {
            choice: choice === "3" ? "3a" : choice,
            broadness: broadness,
            input_text: inputText,
            extra_instructions: backgroundInfo,
            datasets: selectedFolders,
            bid_id: sharedState.object_id
          },
          {
            headers: {
              Authorization: `Bearer ${tokenRef.current}`
            }
          }
        );

        console.log("Received response:", result.data);

     
        let choicesArray = [];
        
        try {
          // First, try splitting by semicolons
          if (result.data && result.data.includes(";")) {
            choicesArray = result.data
              .split(";")
              .map((choice) => choice.trim());
          }

          // If semicolon splitting didn't work, try parsing as a numbered list
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
      
    } catch (error) {
      console.error("Error sending question:", error);
    } finally {
      setIsLoading(false);
      setStartTime(null); // Reset start time when done
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
        [selectedChoice]: 250 // Default word amount
      }));
    }
  };

  const renderChoices = () => {
    return (
      <div className="choices-container">
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
                  className="ml-2 editable-choice"
                  style={{ width: "70%", marginLeft: "10px" }}
                />
              ) : (
                <span
                  onClick={() => handleChoiceSelection(choice)}
                  style={{ cursor: "pointer" }}
                >
                  {choice}
                </span>
              )}
              {selectedChoices.includes(choice) && (
                <Form.Control
                  type="number"
                  value={wordAmounts[choice] || 250}
                  onChange={(e) =>
                    setWordAmounts({
                      ...wordAmounts,
                      [choice]: parseInt(e.target.value, 10)
                    })
                  }
                  min={1}
                  className="ml-2"
                  placeholder="250"
                  style={{ width: "120px", marginLeft: "10px" }}
                />
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
      
      const word_amounts = selectedChoices.map((choice) =>
        String(wordAmounts[choice] || "100")
      );
      
      console.log("Sending request to question_multistep with params:", {
        selectedChoices,
        word_amounts,
        datasets: selectedFolders
      });

      const result = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/question_multistep`,
        {
          choice: "3b",
          broadness: broadness,
          input_text: inputText,
          extra_instructions: backgroundInfo,
          selected_choices: selectedChoices,
          datasets: selectedFolders,
          word_amounts,
          bid_id: sharedState.object_id,
          section_id: section.section_id  // Add section_id to the request
        },
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );

      console.log("Received response from question_multistep:", result.data);
      
      if (result.data.section) {
        // Update answer sections from the response
        const newAnswerSections = result.data.section.subheadings.map(sh => {
          const initialState = EditorState.createWithContent(
            ContentState.createFromText(sh.body || '')
          );
          // Make references bold immediately when creating new sections
          return {
            subheading_id: sh.subheading_id,
            title: sh.title,
            editorState: makeReferencesBoldForState(initialState)
          };
        });
        
        console.log("Setting new answer sections after submission");
        setAnswerSections(newAnswerSections);
      }
      
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

  const makeReferencesBoldForState = (editorState: EditorState): EditorState => {
    const contentState = editorState.getCurrentContent();
    const blockMap = contentState.getBlockMap();
  
    let newContentState = contentState;
    let modificationsCount = 0;
  
    blockMap.forEach((block) => {
      const text = block.getText();
      const key = block.getKey();
  
      // Pattern to match [Extracted...] sections
      const pattern = /\[(?=.*Extracted).*?\]/g;
  
      let matchArray;
      while ((matchArray = pattern.exec(text)) !== null) {
        modificationsCount++;
        const start = matchArray.index;
        const end = start + matchArray[0].length;
  
        const selectionState = SelectionState.createEmpty(key).merge({
          anchorOffset: start,
          focusOffset: end
        });
  
        newContentState = Modifier.applyInlineStyle(
          newContentState,
          selectionState,
          "BOLD"
        );
      }
    });
  
    console.log(`Made ${modificationsCount} reference(s) bold`);
  
    if (modificationsCount > 0) {
      return EditorState.push(
        editorState,
        newContentState,
        'change-inline-style'
      );
    }
    return editorState;
  };
  
  
  // Utility function to remove references from an editor state
  const removeReferencesFromState = (editorState: EditorState): EditorState => {
    const contentState = editorState.getCurrentContent();
    const blockMap = contentState.getBlockMap();
  
    let newContentState = contentState;
  
    // Pattern to match [Extracted...] sections
    const pattern = /\[(?=.*Extracted).*?\]/g;
  
    blockMap.forEach((block) => {
      const text = block.getText();
      const key = block.getKey();
  
      let match;
      let ranges = [];
  
      // Find all matches in the current block
      while ((match = pattern.exec(text)) !== null) {
        ranges.push({
          start: match.index,
          end: pattern.lastIndex
        });
      }
  
      // Remove ranges in reverse order to maintain correct indices
      for (let i = ranges.length - 1; i >= 0; i--) {
        const { start, end } = ranges[i];
        const selectionState = SelectionState.createEmpty(key).merge({
          anchorOffset: start,
          focusOffset: end
        });
  
        newContentState = Modifier.removeRange(
          newContentState,
          selectionState,
          "backward"
        );
      }
    });
  
    return EditorState.push(
      editorState,
      newContentState,
      'remove-range'
    );
  };
  
  // Updated handleAnswerChange function
  const handleAnswerChange = (editorState: EditorState, subheadingId: string) => {
    console.log(`Updating editor state for section ${subheadingId}`, editorState);
    
    setAnswerSections(prev => {
      const updatedSections = prev.map(section => {
        if (section.subheading_id === subheadingId) {
          console.log(`Found matching section, updating content for ${section.title}`);
          return {
            ...section,
            editorState
          };
        }
        return section;
      });
      return updatedSections;
    });
  };
  
  // Function to handle removing references for a specific section
  const handleRemoveReferences = (subheadingId: string) => {
    setAnswerSections(prev => {
      const updatedSections = prev.map(section => {
        if (section.subheading_id === subheadingId) {
          const newEditorState = removeReferencesFromState(section.editorState);
          return {
            ...section,
            editorState: newEditorState
          };
        }
        return section;
      });
      return updatedSections;
    });
  };
  
  // Updated renderAnswerSections function
  const renderAnswerSections = () => (
    <div className="answer-sections">
      {isLoadingSubheadings ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p>Loading sections...</p>
        </div>
      ) : answerSections.length === 0 ? (
        <p>No sections available. Generate some sections to get started.</p>
      ) : (
        answerSections.map((answerSection) => {
          return (
            <div key={answerSection.subheading_id} className="answer-section mb-4">
              <div className="proposal-header">
                <h3 className="lib-title mb-3">{answerSection.title}</h3>
                <Button 
                  className="upload-button"
                  onClick={() => handleRemoveReferences(answerSection.subheading_id)}
                >
                  Remove References
                </Button>
              </div>
              
              <div className="response-box draft-editor">
                <div className="editor-container">
                  <Editor
                    editorState={answerSection.editorState}
                    onChange={(newState) => handleAnswerChange(newState, answerSection.subheading_id)}
                    customStyleMap={{
                      ...styleMap,
                      BOLD: { fontWeight: "bold" }
                    }}
                    readOnly={!canUserEdit}
                    placeholder="Content will be generated here..."
                  />
                </div>
              </div>
              
              <div className="text-muted mt-2">
                Word Count:{" "}
                {
                  convertToRaw(answerSection.editorState.getCurrentContent())
                    .blocks.map((block) => block.text)
                    .join("\n")
                    .split(/\s+/)
                    .filter(Boolean).length
                }
              </div>
            </div>
          );
        })
      )}
    </div>
  );
  // Force a re-render after updating the sections
  useEffect(() => {
    if (contentLoaded) {
      console.log("Content loaded, current answer sections:", answerSections);
      const timeoutId = setTimeout(() => {
        setAnswerSections(prev => [...prev]);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [contentLoaded]);

  const styleMap = {
    ORANGE: {
      backgroundColor: "orange"
    }
  };


  return (
    <div className="chatpage">
      <SideBarSmall />

      <div className="lib-container">
        <div className="scroll-container">
          <BidNavbar />

          <div>
            <Row
              className="justify-content-md-center"
              style={{ visibility: "hidden", height: 0, overflow: "hidden" }}
            >
              <FolderLogic
                tokenRef={tokenRef}
                setAvailableCollections={setAvailableCollections}
                setFolderContents={setFolderContents}
                availableCollections={availableCollections}
                folderContents={folderContents}
              />
            </Row>

            <Col md={12}>
            <BidTitle
              canUserEdit={true}
              displayAlert={displayAlert}
              setSharedState={setSharedState}
              sharedState={sharedState}
              showViewOnlyMessage={showViewOnlyMessage}
              initialBidName={"initialBidName"}
            />
              <h2 className="heavy mb-4">{section.heading}</h2>
              <h1 className="lib-title" id="question-section">
                  Search tender for relevant information
                </h1>
              <div className="tender-box mb-3">
                <textarea
                  className="card-textarea"
                  placeholder="Enter question here..."
                  disabled={!canUserEdit}
                ></textarea>
              </div>
              <div className="proposal-header mb-2">
                <h1 className="lib-title" id="question-section">
                  Question
                </h1>
                <div className="dropdown-container">
                  <SelectFolderModal
                    onSaveSelectedFolders={handleSaveSelectedFolders}
                    initialSelectedFolders={selectedFolders}
                  />
                </div>
              </div>

              <div className="question-answer-box">
                <textarea
                  className="card-textarea"
                  placeholder="Enter question here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={!canUserEdit}
                ></textarea>
              </div>
              <div className="text-muted mt-2">
                Word Count: {inputText.split(/\s+/).filter(Boolean).length}
              </div>
              <Button
                className="upload-button mt-1"
                onClick={sendQuestionToChatbot}
                disabled={inputText.trim() === ""}
              >
                Submit
              </Button>

              <Row>
                <div className="" style={{ textAlign: "left" }}>
                  {isLoading && (
                    <div className="my-3">
                      <Spinner animation="border" />
                      <div>Elapsed Time: {elapsedTime.toFixed(1)}s</div>
                    </div>
                  )}
                  {choice === "3" && apiChoices.length > 0 && (
                    <div>
                      {renderChoices()}
                      <Button
                        variant="primary"
                        onClick={submitSelections}
                        className="upload-button mt-3"
                        disabled={selectedChoices.length === 0}
                      >
                        Generate answers for selected subsections
                      </Button>
                    </div>
                  )}
                </div>
              </Row>
            </Col>

           
             
                <div className="proposal-header">
                  <h1 id="answer-section" className="lib-title mt-4 mb-3">
                  Responses
                  </h1>
                  </div>
                  {renderAnswerSections()}
                 
                

                <SaveQASheet
                  inputText={inputText}
                  responseEditorState={responseEditorState}
                />
            
              
            
          </div>
        </div>
      </div>
      <QuestionCrafterWizard />
    </div>
  );
};

export default withAuth(QuestionCrafter);
