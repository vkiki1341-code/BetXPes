import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900/20 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-12 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        <h1 className="text-5xl md:text-6xl font-bold mb-12 text-white">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              BetXPesa ("we," "us," "our," or "Company") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <p>We collect information in the following ways:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Information you provide directly (name, email, phone number, payment information)</li>
              <li>Information collected automatically (IP address, browser type, pages visited)</li>
              <li>Information from third parties (payment processors, identity verification services)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Use of Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>Provide and maintain our services</li>
              <li>Process transactions and send related information</li>
              <li>Send promotional communications</li>
              <li>Comply with legal obligations</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect and prevent fraudulent activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
            <p>
              BetXPesa implements comprehensive security measures to protect your personal information 
              from unauthorized access, alteration, disclosure, or destruction. We use industry-standard 
              encryption, secure servers, and regular security audits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Cookies</h2>
            <p>
              We use cookies to enhance your experience on our platform. These help us remember your 
              preferences, understand how you use our services, and provide personalized content. 
              You can control cookie settings in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Third-Party Services</h2>
            <p>
              We may share your information with third-party service providers (payment processors, 
              analytics providers, customer support tools) who assist us in operating our platform. 
              These providers are bound by confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information. 
              You can also opt-out of promotional communications at any time. 
              To exercise these rights, contact us at privacy@betxpesa.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. GDPR Compliance</h2>
            <p>
              If you are located in the European Union, you have additional rights under GDPR. 
              We are fully compliant with GDPR regulations and respect your data rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Changes to This Policy</h2>
            <p>
              BetXPesa may update this Privacy Policy from time to time. We will notify you of 
              significant changes by posting the new policy on our website with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
              <br />
              Email: privacy@betxpesa.com
              <br />
              Address: 123 Betting Lane, San Francisco, CA 94105
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Last Updated</h2>
            <p>
              January 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
