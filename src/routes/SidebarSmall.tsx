import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SidebarSmall.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

import {
  faBookOpen,
  faLayerGroup,
  faReply, // Icon for comments or responses
  faComments,
  faCircleQuestion,
  faUser,
  faCircleExclamation,
  faFileWord
} from "@fortawesome/free-solid-svg-icons";
// Import the image import sidebarIcon from '../resources/images/mytender.io_badge.png';

const SideBarSmall = () => {
  const location = useLocation(); // Hook to get the current location
  const navigate = useNavigate();
  const [lastActiveBid, setLastActiveBid] = useState(null);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const storedBid = localStorage.getItem("lastActiveBid");
    if (storedBid) {
      setLastActiveBid(JSON.parse(storedBid));
    }

    const handleBidUpdate = (event) => {
      const updatedBid = event.detail;
      setLastActiveBid(updatedBid);
      localStorage.setItem("lastActiveBid", JSON.stringify(updatedBid));
    };

    window.addEventListener("bidUpdated", handleBidUpdate);

    return () => {
      window.removeEventListener("bidUpdated", handleBidUpdate);
    };
  }, []);

  const handleDashboardClick = (e) => {
    e.preventDefault();
    if (lastActiveBid) {
      const lastActiveTab =
        localStorage.getItem("lastActiveTab") || "/bid-extractor";
      navigate(lastActiveTab, {
        state: { bid: lastActiveBid, fromBidsTable: true }
      });
    } else {
      navigate("/bids");
    }
  };

  const handleShowTips = () => {
    localStorage.setItem("dashboardTourCompleted", "false");
    localStorage.setItem("bidCompilerTourCompleted", "false");
    localStorage.setItem("bidExtractorTourCompleted", "false");
    localStorage.setItem("libraryTourCompleted", "false");
    localStorage.setItem("questionCrafterTourCompleted", "false");
    localStorage.setItem("quickquestionWizardTourCompleted", "false");
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new Event("showTips"));
  };

  const handleWordAddInClick = (e) => {
    e.preventDefault(); // Prevent any default navigation
    const url = 'https://appsource.microsoft.com/en-us/product/office/WA200007690?src=office&corrid=bd0c24c3-6022-e897-73ad-0dc9bdf3558b&omexanonuid=&referralurl=';
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  

  return (
    <div className="sidebarsmall">
      <div>
        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="dashboard-tooltip">Manage and view all your tenders</Tooltip>}
        >
          <Link
            to="#"
            className={`sidebarsmalllink ${isActive("/bids") || isActive("/bid-extractor") || isActive("/question-crafter") || isActive("/proposal") ? "sidebarsmalllink-active" : ""}`}
            onClick={handleDashboardClick}
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            <span id="bids-table">Dashboard</span>
          </Link>
        </OverlayTrigger>

        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="library-tooltip">Access and manage your company's content library</Tooltip>}
        >
          <Link
            to="/library"
            className={`sidebarsmalllink ${isActive("/library") ? "sidebarsmalllink-active" : ""}`}
          >
            <FontAwesomeIcon icon={faBookOpen} />
            <span id="library-title">Content Library</span>
          </Link>
        </OverlayTrigger>

        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="chat-tooltip">Ask AI quick questions about your documents</Tooltip>}
        >
          <Link
            to="/chatResponse"
            className={`sidebarsmalllink ${isActive("/chatResponse") ? "sidebarsmalllink-active" : ""}`}
          >
            <FontAwesomeIcon icon={faComments} />
            <span id="welcome">Quick Question</span>
          </Link>
        </OverlayTrigger>

        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="qa-tooltip">Generate Q&A content for your proposals</Tooltip>}
        >
          <Link
            to="/question-answer"
            className={`sidebarsmalllink ${isActive("/question-answer") ? "sidebarsmalllink-active" : ""}`}
          >
            <FontAwesomeIcon icon={faCircleQuestion} />
            <span>Q&A Generator</span>
          </Link>
        </OverlayTrigger>
      </div>

      <div className="signout-container">
        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="profile-tooltip">View and edit your profile settings</Tooltip>}
        >
          <Link
            to="/profile"
            className={`sidebarsmalllink ${isActive("/profile") ? "sidebarsmalllink-active" : ""}`}
          >
            <FontAwesomeIcon icon={faUser} />
            <span>Profile</span>
          </Link>
        </OverlayTrigger>

        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="wordpane-tooltip">Open mytender.io Word Add-in</Tooltip>}
        >
          <Link
            to="#"
            className="sidebarsmalllink"
            onClick={handleWordAddInClick}
          >
            <FontAwesomeIcon icon={faFileWord} />
            <span>Wordpane</span>
          </Link>
        </OverlayTrigger>

        <OverlayTrigger
          placement="right"
          overlay={<Tooltip id="logout-tooltip">Sign out of your account</Tooltip>}
        >
          <Link
            to="/logout"
            className={`sidebarsmalllink ${isActive("/logout") ? "sidebarsmalllink-active" : ""}`}
          >
            <FontAwesomeIcon icon={faReply} />
            <span>Logout</span>
          </Link>
        </OverlayTrigger>
      </div>
    </div>
  );
};

export default SideBarSmall;
