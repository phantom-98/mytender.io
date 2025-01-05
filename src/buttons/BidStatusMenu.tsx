import { Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { Button } from "react-bootstrap";
import './BidStatusMenu.css';

type BidStatus = "Identification" | "Capture Planning" | "First Review" | "Final Review" | "Submitted";

const BidStatusMenu = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: BidStatus) => void;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Validate and normalize the status value
  const normalizeStatus = (status: any): BidStatus => {
    const validStatuses: BidStatus[] = [
      "Identification",
      "Capture Planning",
      "First Review",
      "Final Review",
      "Submitted"
    ];
    return validStatuses.includes(status) ? status : "Identification";
  };

  const currentStatus = normalizeStatus(value);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (status: BidStatus) => {
    onChange(status);
    handleClose();
  };

  const getStatusColor = (status: BidStatus) => {
    switch (status) {
      case "Identification":
        return "status-identification";
      case "Capture Planning":
        return "status-capture";
      case "First Review":
        return "status-first-review";
      case "Final Review":
        return "status-final-review";
      case "Submitted":
        return "status-submitted";
      default:
        return "status-identification";
    }
  };

  return (
    <div>
      <Button
        onClick={handleClick}
        className={`${getStatusColor(currentStatus)} text-nowrap d-inline-block`}
        aria-controls="bid-status-menu"
        aria-haspopup="true"
      >
        {currentStatus}
      </Button>
      <Menu
        id="bid-status-menu"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        keepMounted
        PaperProps={{
          elevation: 1,
          style: {
            width: "160px", // Increased width to accommodate longer status names
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }
        }}
      >
        <MenuItem
          onClick={() => handleSelect("Identification")}
          className="styled-menu-item"
        >
          Identification
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect("Capture Planning")}
          className="styled-menu-item"
        >
          Capture Planning
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect("First Review")}
          className="styled-menu-item"
        >
          First Review
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect("Final Review")}
          className="styled-menu-item"
        >
          Final Review
        </MenuItem>
        <MenuItem
          onClick={() => handleSelect("Submitted")}
          className="styled-menu-item"
        >
          Submitted
        </MenuItem>
      </Menu>
    </div>
  );
};

export default BidStatusMenu;