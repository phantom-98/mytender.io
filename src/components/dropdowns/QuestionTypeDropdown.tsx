import { MenuItem, Select, SelectChangeEvent } from "@mui/material";

const selectStyle = {
  fontFamily: '"Manrope", sans-serif',
  fontSize: "0.875rem",
  minWidth: "220px",
  backgroundColor: "white", // Add white background
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

const QuestionTypeDropdown = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as string);
  };

  return (
    <Select
      value={value || "3b"}
      onChange={handleChange}
      size="small"
      style={selectStyle}
      displayEmpty
      MenuProps={{
        PaperProps: {
          style: menuStyle
        }
      }}
    >
      <MenuItem value="3b" style={menuStyle}>
        <em>General</em>
      </MenuItem>
      <MenuItem value="3b_case_study" style={menuStyle}>
        <em>Case Study</em>
      </MenuItem>
      <MenuItem value="3b_commercial" style={menuStyle}>
        <em>Compliance</em>
      </MenuItem>
      <MenuItem value="3b_personnel" style={menuStyle}>
        <em>Team</em>
      </MenuItem>
      <MenuItem value="3b_technical" style={menuStyle}>
        <em>Technical</em>
      </MenuItem>
    </Select>
  );
};

export default QuestionTypeDropdown;
