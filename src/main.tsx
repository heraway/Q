import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "./i18n";
import CustomerTicket from "./pages/CustomerTicket";
import StaffTerminal from "./pages/StaffTerminal";
import ManageBusiness from "./pages/ManageBusiness";
import SuperAdmin from "./pages/SuperAdmin";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer scans a QR that points straight here — no login, no app required */}
          <Route path="/b/:businessSlug" element={<CustomerTicket />} />
          {/* Staff terminals — one per counter/table, logged in as the business's staff */}
          <Route path="/staff/:businessSlug" element={<StaffTerminal />} />
          {/* Add/rename/remove queues and stations, rename the business */}
          <Route path="/staff/:businessSlug/manage" element={<ManageBusiness />} />
          {/* You: manage every business from one place */}
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);

function Landing() {
  return (
    <div className="screen">
      <div className="ticket">
        <div className="ticket-label">Q</div>
        <div style={{ fontSize: 20, fontWeight: 600, margin: "10px 0" }}>Skip the line, keep your seat</div>
        <p style={{ fontSize: 14, color: "#5B6B78" }}>
          Scan the QR code at the counter to get your ticket. Businesses: see your
          staff terminal at <code>/staff/your-business-slug</code>.
        </p>
      </div>
    </div>
  );
}
