import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import { useLocation } from "react-router-dom";
import { Col, Row } from "react-bootstrap";
import BidNavbar from "../routes/BidNavbar.tsx";
import "./BidPlanner.css";
import { BidContext } from "./BidWritingStateManagerView.tsx";
import { displayAlert } from "../helper/Alert";
import TenderLibrary from "../components/TenderLibrary.tsx";
import TenderAnalysis from "../components/TenderAnalysis.tsx";

const BidPlanner = () => {
  const getAuth = useAuthUser();
  const auth = useMemo(() => getAuth(), [getAuth]);
  const tokenRef = useRef(auth?.token || "default");

  const { sharedState, setSharedState } = useContext(BidContext);
  const { bidInfo, contributors, object_id } = sharedState;

  const location = useLocation();
  const bidData = location.state?.bid || "";
  const initialBidName = location.state?.bidName;

  const [loading, setLoading] = useState(false);
  const [existingBidNames, setExistingBidNames] = useState([]);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  const currentUserPermission = contributors[auth.email] || "viewer";
  const canUserEdit =
    currentUserPermission === "admin" || currentUserPermission === "editor";

  const showViewOnlyMessage = () => {
    displayAlert("You only have permission to view this bid.", "danger");
  };

  const fetchOrganizationUsers = async () => {
    try {
      const response = await axios.get(
        `http${HTTP_PREFIX}://${API_URL}/organization_users`,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );
      setOrganizationUsers(response.data);
    } catch (err) {
      console.log("Error fetching organization users:");
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await axios.get(
        `http${HTTP_PREFIX}://${API_URL}/profile`,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );
      setCurrentUserEmail(response.data.email);
    } catch (err) {
      console.log("Failed to load profile data");
      setLoading(false);
    }
  };

  const fetchExistingBidNames = async () => {
    try {
      const response = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/get_bids_list/`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`
          }
        }
      );
      if (response.data && response.data.bids) {
        setExistingBidNames(response.data.bids.map((bid) => bid.bid_title));
      }
    } catch (error) {
      console.error("Error fetching bid names:", error);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([
        fetchUserData(),
        fetchOrganizationUsers(),
        fetchExistingBidNames()
      ]);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const navigatedFromBidsTable = localStorage.getItem(
      "navigatedFromBidsTable"
    );

    if (
      navigatedFromBidsTable === "true" &&
      location.state?.fromBidsTable &&
      bidData
    ) {
      setSharedState((prevState) => {
        const original_creator = bidData?.original_creator || auth.email;
        let contributors = bidData?.contributors || {};

        if (
          !bidData?.original_creator ||
          Object.keys(contributors).length === 0
        ) {
          contributors = { [auth.email]: "admin" };
        }

        return {
          ...prevState,
          bidInfo: bidData?.bid_title || "",
          opportunity_information:
            bidData?.opportunity_information?.trim() || "",
          compliance_requirements:
            bidData?.compliance_requirements?.trim() || "",
          tender_summary: bidData?.tender_summary?.trim() || "",
          evaluation_criteria: bidData?.evaluation_criteria?.trim() || "",
          derive_insights: bidData?.derive_insights?.trim() || "",
          differentiation_opportunities:
            bidData?.differentiation_opportunities?.trim() || "",
          client_name: bidData?.client_name || "",
          bid_qualification_result: bidData?.bid_qualification_result || "",
          questions: bidData?.questions || "",
          opportunity_owner: bidData?.opportunity_owner || "",
          submission_deadline: bidData?.submission_deadline || "",
          bid_manager: bidData?.bid_manager || "",
          contributors: contributors,
          original_creator: original_creator,
          object_id: bidData?._id || "",
          outline: bidData?.outline || []
        };
      });

      localStorage.setItem("navigatedFromBidsTable", "false");
    } else if (initialBidName && initialBidName !== "") {
      setSharedState((prevState) => ({
        ...prevState,
        bidInfo: initialBidName,
        original_creator: auth.email,
        contributors: auth.email ? { [auth.email]: "admin" } : {}
      }));
    }
    const updatedBid = { bidData };
    window.dispatchEvent(new CustomEvent("bidUpdated", { detail: updatedBid }));
  }, []);

  return (
    <div className="chatpage">
      <SideBarSmall />
      <div className="lib-container">
        <div className="scroll-container">
          <BidNavbar
            showViewOnlyMessage={showViewOnlyMessage}
            initialBidName={initialBidName}
          />
          <div>
            <Row className="mt-4">
              <Col md={12}>
                <TenderLibrary key={object_id} object_id={object_id} />
              </Col>
            </Row>
            <div className="mt-4">
              <TenderAnalysis canUserEdit={canUserEdit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(BidPlanner);
