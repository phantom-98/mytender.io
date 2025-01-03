import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SidebarSmall.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import sidebarIcon from "../resources/images/mytender.io_badge.png"; // Add this at the top with other imports

import {
  faBookOpen,
  faLayerGroup,
  faReply, // Icon for comments or responses
  faComments,
  faCircleQuestion,
  faUser,
  faFileWord,
  faGraduationCap
} from "@fortawesome/free-solid-svg-icons";
// Import the image import sidebarIcon from '../resources/images/mytender.io_badge.png';

// Define interface for lastActiveBid
interface LastActiveBid {
  _id: string;
  bid_title: string;
  status: string;
  [key: string]: any; // for any additional properties
}

// Define custom event type
interface BidUpdateEvent extends Event {
  detail: LastActiveBid;
}

const SideBarSmall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [lastActiveBid, setLastActiveBid] = useState<LastActiveBid | null>(
    null
  );

  const isActive = (path: string): boolean => location.pathname === path;

  useEffect(() => {
    const storedBid = localStorage.getItem("lastActiveBid");
    if (storedBid) {
      setLastActiveBid(JSON.parse(storedBid));
    }

    const handleBidUpdate = (event: BidUpdateEvent) => {
      const updatedBid = event.detail;
      setLastActiveBid(updatedBid);
      localStorage.setItem("lastActiveBid", JSON.stringify(updatedBid));
    };

    window.addEventListener("bidUpdated", handleBidUpdate as EventListener);

    return () => {
      window.removeEventListener(
        "bidUpdated",
        handleBidUpdate as EventListener
      );
    };
  }, []);

  const handleDashboardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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

  const handleWordAddInClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const url =
      "https://appsource.microsoft.com/en-us/product/office/WA200007690?src=office&corrid=bd0c24c3-6022-e897-73ad-0dc9bdf3558b&omexanonuid=&referralurl=";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="sidebarsmall">
      <div>
        <div className="sidebar-header">
          <img src={sidebarIcon} alt="mytender.io logo" />
          <span>mytender.io</span>
        </div>

        <Link
          to="#"
          className={`sidebarsmalllink ${isActive("/bids") || isActive("/bid-extractor") || isActive("/question-crafter") || isActive("/proposal") ? "sidebarsmalllink-active" : ""}`}
          onClick={handleDashboardClick}
        >
          <FontAwesomeIcon icon={faLayerGroup} />
          <span id="bids-table">Dashboard</span>
        </Link>

        <Link
          to="/chatResponse"
          className={`sidebarsmalllink ${isActive("/chatResponse") ? "sidebarsmalllink-active" : ""}`}
        >
          <FontAwesomeIcon icon={faComments} />
          <span id="welcome">Quick Question</span>
        </Link>

        <Link
          to="/question-answer"
          className={`sidebarsmalllink ${isActive("/question-answer") ? "sidebarsmalllink-active" : ""}`}
        >
          <FontAwesomeIcon icon={faCircleQuestion} />
          <span>Q&A Generator</span>
        </Link>

        <Link
          to="#"
          className="sidebarsmalllink"
          onClick={handleWordAddInClick}
        >
          <FontAwesomeIcon icon={faFileWord} />
          <span>Wordpane</span>
        </Link>
      </div>

      <div className="signout-container">
        <Link
          to="/library"
          className={`bordered-sidebar-link sidebarsmalllink ${isActive("/library") ? "sidebarsmalllink-active" : ""}`}
        >
          <FontAwesomeIcon icon={faBookOpen} />
          <span id="library-title">Content Library</span>
        </Link>

        <Link
          to="https://app.storylane.io/demo/tui6kl0bnkrw?embed=inline"
          className="sidebarsmalllink"
          target="_blank" // Opens in new tab
          rel="noopener noreferrer" // Security best practice for external links
        >
          <FontAwesomeIcon icon={faGraduationCap} />{" "}
          {/* Academic cap icon - perfect for tutorials */}
          <span>How To</span>
        </Link>
        <Link
          to="/profile"
          className={`sidebarsmalllink ${isActive("/profile") ? "sidebarsmalllink-active" : ""}`}
        >
          <FontAwesomeIcon icon={faUser} />
          <span>Profile</span>
        </Link>
        {/* <Link
          to="/logout"
          className={`sidebarsmalllink ${isActive("/logout") ? "sidebarsmalllink-active" : ""}`}
        >
          <FontAwesomeIcon icon={faReply} />
          <span>Logout</span>
        </Link> */}
      </div>
    </div>
  );
};

export default SideBarSmall;
