import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, HTTP_PREFIX } from "../helper/Constants";
import axios from "axios";
import withAuth from "../routes/withAuth";
import { useAuthUser } from "react-auth-kit";
import SideBarSmall from "../routes/SidebarSmall.tsx";
import { useLocation } from "react-router-dom";
import {
  Col,
  Row,

} from "react-bootstrap";
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
  const {
    bidInfo,
    opportunity_information,
    compliance_requirements,
    questions,
    contributors,
    object_id
  } = sharedState;

  const location = useLocation();
  const bidData = location.state?.bid || "";
  const initialBidName = location.state?.bidName; // Retrieve bidName from location state

  const [loading, setLoading] = useState(false);

  const [existingBidNames, setExistingBidNames] = useState([]);

  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [showContributorModal, setShowContributorModal] = useState(false);

  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const currentUserPermission = contributors[auth.email] || "viewer"; // Default to 'viewer' if not found
  console.log("currentUserpermissionextract" + currentUserPermission);
  const canUserEdit =
    currentUserPermission === "admin" || currentUserPermission === "editor";

  const showViewOnlyMessage = () => {
    console.log(currentUserPermission);
    displayAlert("You only have permission to view this bid.", "danger");
  };

  const [isGeneratingCompliance, setIsGeneratingCompliance] = useState(false);

  const generateComplianceRequirements = async () => {
    if (!canUserEdit) {
      showViewOnlyMessage();
      return;
    }

    setIsGeneratingCompliance(true);
    const formData = new FormData();
    formData.append("bid_id", object_id);

    try {
      const result = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/generate_compliance_requirements`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setSharedState((prevState) => ({
        ...prevState,
        compliance_requirements: result.data.requirements
      }));

      displayAlert(
        "Compliance requirements generated successfully!",
        "success"
      );
    } catch (err) {
      console.error("Error generating compliance requirements:", err);
      if (err.response && err.response.status === 404) {
        displayAlert(
          "No documents found in the tender library. Please upload documents before generating compliance requirements.",
          "warning"
        );
      } else {
        displayAlert(
          "No documents found in the tender library. Please upload documents before generating compliance requirements.",
          "danger"
        );
      }
    } finally {
      setIsGeneratingCompliance(false);
    }
  };

  const [isGeneratingOpportunity, setIsGeneratingOpportunity] = useState(false);

  const generateOpportunityInformation = async () => {
    if (!canUserEdit) {
      showViewOnlyMessage();
      return;
    }

    setIsGeneratingOpportunity(true);
    const formData = new FormData();
    formData.append("bid_id", object_id);

    try {
      const result = await axios.post(
        `http${HTTP_PREFIX}://${API_URL}/generate_opportunity_information`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setSharedState((prevState) => ({
        ...prevState,
        opportunity_information: result.data.opportunity_information
      }));

      displayAlert(
        "Opportunity information generated successfully!",
        "success"
      );
    } catch (err) {
      console.error("Error generating opportunity information:", err);
      if (err.response && err.response.status === 404) {
        displayAlert(
          "No documents found in the tender library. Please upload documents before generating opportunity information.",
          "warning"
        );
      } else {
        displayAlert(
          "No documents found in the tender library. Please upload documents before generating opportunity information.",
          "danger"
        );
      }
    } finally {
      setIsGeneratingOpportunity(false);
    }
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
      console.log(contributors);
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
      console.log("from bids table");
      console.log(bidData);

      setSharedState((prevState) => {
        const original_creator = bidData?.original_creator || auth.email;
        let contributors = bidData?.contributors || {};

        if (
          !bidData?.original_creator ||
          Object.keys(contributors).length === 0
        ) {
          console.log("length 0");

          console.log(currentUserEmail);
          //had to change to user their login
          contributors = { [auth.email]: "admin" };
        }

        return {
          ...prevState,
          bidInfo: bidData?.bid_title || "",
          opportunity_information:
            bidData?.opportunity_information?.trim() || "",
          compliance_requirements:
            bidData?.compliance_requirements?.trim() || "",
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
      // Update bidInfo with the initial bid name if it's provided and not empty
      // USER CREATES A NEW BID
      console.log("newbid created");
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
            <TenderAnalysis canUserEdit={canUserEdit}  />
            </div>
           
          </div>
        </div>
      </div>
      {/*<BidPlannerWizard />*/}
    </div>
  );
};

export default withAuth(BidPlanner);
