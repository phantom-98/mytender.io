import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faUserCircle } from "@fortawesome/free-solid-svg-icons";

interface ReviewerDropdownProps {
  value: string;
  onChange: (value: string) => void;
  contributors: Record<string, string>;
  className?: string;
}

const selectStyle = {
  fontFamily: '"Manrope", sans-serif',
  fontSize: "0.875rem",
  minWidth: "220px",
  backgroundColor: "white",
  "& MuiOutlinedInputNotchedOutline": {
    borderColor: "#ced4da"
  },
  "&:hover MuiOutlinedInputNotchedOutline": {
    borderColor: "#86b7fe"
  },
  "&.MuiFocused MuiOutlinedInputNotchedOutline": {
    borderColor: "#86b7fe",
    borderWidth: "1px"
  }
};

const menuStyle = {
  fontSize: "12px",
  fontFamily: '"Manrope", sans-serif'
};

const menuItemStyle = {
  ...menuStyle,
  display: "flex",
  alignItems: "center",
  gap: "8px" // Adds space between icon and text
};

const ReviewerDropdown: React.FC<ReviewerDropdownProps> = ({
  value,
  onChange,
  contributors,
  className
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as string);
  };

  return (
    <Select
      value={value || ""}
      onChange={handleChange}
      size="small"
      style={selectStyle}
      className={className}
      displayEmpty
      MenuProps={{
        PaperProps: {
          style: menuStyle
        }
      }}
    >
      <MenuItem value="" style={menuItemStyle}>
        <FontAwesomeIcon icon={faUserCircle} size="sm" className="me-2" />
        <em>Select Reviewer</em>
      </MenuItem>
      {Object.entries(contributors).length > 0 ? (
        Object.entries(contributors).map(([email, role], index) => (
          <MenuItem key={index} value={email} style={menuItemStyle}>
            <FontAwesomeIcon icon={faUserCircle} size="sm" className="me-2" />
            {email} ({role})
          </MenuItem>
        ))
      ) : (
        <MenuItem disabled value="" style={menuItemStyle}>
          <FontAwesomeIcon icon={faUserCircle} size="sm" className="me-2" />
          No Contributors Available
        </MenuItem>
      )}
    </Select>
  );
};

export default ReviewerDropdown;
