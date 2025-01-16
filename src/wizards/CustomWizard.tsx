import React, { useState, useEffect, useRef } from "react";
import "./CustomWizard.css";
import { Button } from "react-bootstrap";
import { Button as MuiButton } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChevronLeft,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import { ButtonGroup } from "@mui/material";
import { ArrowBack, ArrowForward } from "@mui/icons-material";

const CustomWizard = ({ steps, isShow, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (isShow && steps.length > 0) {
      const targetElement = document.getElementById(
        steps[currentStep].elementId
      );
      const tooltipElement = tooltipRef.current;
      if (targetElement && tooltipElement) {
        // Scroll the target element into view
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // Recalculate position after scrolling
        setTimeout(() => {
          const targetRect = targetElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          // Calculate position
          let top = targetRect.bottom;
          let left = targetRect.left;

          // Adjust the tooltip based on the "position" (left or right)
          if (steps[currentStep].position === "left") {
            left = left - 50;
          } else if (steps[currentStep].position === "farleft") {
            left = left - 130;
          } else if (steps[currentStep].position === "right") {
            left = left + 50;
          } else if (steps[currentStep].position === "farright") {
            left = left + 130;
          } else if (steps[currentStep].position === "down") {
            top = top + 70;
          }

          // Ensure the tooltip stays within the viewport
          if (top + tooltipElement.offsetHeight > viewportHeight) {
            top = Math.max(0, viewportHeight - tooltipElement.offsetHeight);
          }

          tooltipElement.style.top = `${top}px`;
          tooltipElement.style.left = `${left}px`;
        }, 100); // Small delay to ensure scrolling has completed
      }
    }
  }, [isShow, currentStep, steps]);

  if (!isShow || steps.length === 0) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 highz"
        onClick={onClose}
      ></div>
      <div
        ref={tooltipRef}
        className="fixed bg-white p-4 rounded-lg shadow-lg max-w-md w-full highz custom-wizard"
        style={{
          position: "fixed",
          maxWidth: "310px",
          transition: "all 0.3s ease-in-out"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h3 className="mb-0">{currentStepData.title}</h3>
          <button className="wizard-close-button" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <p className="step-subtext text-gray-500 mb-3">
          {currentStep + 1} of {steps.length}
        </p>
        <p className="mb-3">{currentStepData.description}</p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "30px"
          }}
        >
          <ButtonGroup
            variant="contained"
            aria-label="navigation button group"
            style={{
              backgroundColor: "black",
              borderRadius: "4px",
              "& .MuiButtonGroup-grouped:not(:last-of-type)": {
                borderColor: "white"
              }
            }}
          >
            <MuiButton
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="font-clash-display"
              style={{
                fontFamily: "Manrope, sans-serif",
                color: "white",
                borderColor: "white",
                backgroundColor: "black",
                padding: "4px 12px",
                fontSize: "0.85rem",
                "&:hover": {
                  backgroundColor: "#333"
                }
              }}
            >
              Back
            </MuiButton>
            <MuiButton
              onClick={handleNext}
              className="font-clash-display"
              style={{
                fontFamily: "Manrope, sans-serif",
                color: "white",
                backgroundColor: "black",
                padding: "4px 12px",
                fontSize: "0.85rem",
                "&:hover": {
                  backgroundColor: "#333"
                }
              }}
            >
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
            </MuiButton>
          </ButtonGroup>
        </div>
      </div>
    </>
  );
};

export default CustomWizard;
