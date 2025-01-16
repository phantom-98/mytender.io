import { Route, Routes } from "react-router-dom";
import SignInComponent from "../components/auth/SignIn";
import SignOut from "../components/auth/SignOutButton";
import Pannels from "../views/Pannels";
import Log from "../components/Log";
import FLog from "../components/FLog";
import UploadTemplateText from "../components/UploadTemplateText.tsx";
import Bids from "../views/Bids";
import Library from "../views/Library";
import Proposal from "../views/Proposal.tsx";
import Dashboard from "../views/Dashboard.tsx";
import ChatbotResponse from "../views/ChatbotResponse.tsx";
import BidExtractor from "../views/BidExtractor.tsx";
import QuestionCrafter from "../views/QuestionCrafter.tsx";
import Calculator from "../views/Calculator.tsx";
import BidManagement from "../views/BidWritingStateManagerView.tsx";
import HowTo from "../views/HowTo.tsx";
import ProfilePage from "../views/Profile.tsx";
import Signup from "../views/Signup.tsx";
import ForgotPassword from "../views/ForgotPassword.tsx";
import ProposalPlan from "../views/ProposalPlan.tsx";
import QAGenerator from "../views/Q&AGenerator.tsx";
import ProposalPreview from "../views/ProposalPreview.tsx";
import posthog from "posthog-js";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import ComplianceMatrix from "../views/ComplianceMatrix.tsx";
import BidPlanner from "../views/BidPlanner.tsx";

function Routing() {
  const location = useLocation();

  // Track page views
  useEffect(() => {
    posthog.capture("$pageview", {
      path: location.pathname,
      search: location.search,
      email: posthog.get_distinct_id()
    });
  }, [location]);

  return (
    <div>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calculator" element={<Calculator />} />
        <Route path="/" element={<Bids />} />
        <Route path="/chatResponse" element={<ChatbotResponse />} />
        <Route path="/login" element={<SignInComponent />} />
        <Route path="/logout" element={<SignOut />} />
        <Route path="/adminpannel" element={<Pannels />} />
        <Route path="/uploadtemplatetext" element={<UploadTemplateText />} />
        <Route path="/qlog" element={<Log />} />
        <Route path="/flog" element={<FLog />} />
        <Route path="/library" element={<Library />} />
        <Route path="/howto" element={<HowTo />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset_password" element={<ForgotPassword />} />
        <Route path="/question-answer" element={<QAGenerator />} />
        {/* Wrap related routes inside a single parent Route with BidManagement */}
        <Route element={<BidManagement />}>
          {/* <Route path="/bid-extractor" element={<BidExtractor />} /> */}
          <Route path="/bid-extractor" element={<BidPlanner />} />
          <Route path="/proposal-planner" element={<ProposalPlan />} />
          <Route path="/question-crafter" element={<QuestionCrafter />} />
          <Route path="/compliance-matrix" element={<ComplianceMatrix />} />
          <Route path="/proposal" element={<Proposal />} />
          <Route path="/proposal-preview" element={<ProposalPreview />} />
          <Route path="/bids" element={<Bids />} />
        </Route>
      </Routes>
    </div>
  );
}

export default Routing;
