import React from "react";
import { ButtonGroup, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTable, faColumns } from "@fortawesome/free-solid-svg-icons";
import "./ViewToggle.css";
interface ViewToggleProps {
  value: string;
  onChange: (view: "table" | "kanban") => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  return (
    <ButtonGroup>
      <Button
        variant={value === "table" ? "primary" : "light"}
        onClick={() => onChange("table")}
        className="view-toggle-btn"
      >
        <FontAwesomeIcon icon={faTable} className="me-2" />
        Table
      </Button>
      <Button
        variant={value === "kanban" ? "primary" : "light"}
        onClick={() => onChange("kanban")}
        className="view-toggle-btn"
      >
        <FontAwesomeIcon icon={faColumns} className="me-2" />
        Kanban
      </Button>
    </ButtonGroup>
  );
};

export default ViewToggle;
