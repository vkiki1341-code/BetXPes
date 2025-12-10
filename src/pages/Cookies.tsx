import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Cookies() {
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
          Cookie Policy
        </h1>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit our website. 
              They are widely used to make websites work more efficiently and to provide information 
              to website owners. Cookies allow us to recognize your device and remember your preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Types of Cookies We Use</h2>
            <div className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Essential Cookies</h3>
                <p>
                  These cookies are necessary for the website to function properly. 
                  They enable core functionality such as security and network management.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Performance Cookies</h3>
                <p>
                  These cookies collect information about how you use our website, such as which 
                  pages you visit and how long you spend on them. This helps us improve our services.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Functional Cookies</h3>
                <p>
                  These cookies remember your preferences and choices to provide a more personalized 
                  experience on our website.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Marketing Cookies</h3>
                <p>
                  These cookies track your browsing habits and are used to display relevant 
                  advertisements on other websites you visit.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Third-Party Cookies</h2>
            <p>
              We use third-party services such as Google Analytics, Facebook Pixel, and other 
              analytics providers. These third parties may set cookies on your device to track 
              your activity across multiple websites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Cookie Duration</h2>
            <p>
              Cookies can be either "session" cookies (deleted when you close your browser) or 
              "persistent" cookies (remain on your device for a set period). Most cookies we use 
              are persistent cookies that expire after 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Managing Cookies</h2>
            <p>
              You can control and manage cookies through your browser settings. Most browsers allow 
              you to:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 ml-4">
              <li>See what cookies are set and delete them individually</li>
              <li>Reject all or certain types of cookies</li>
              <li>Delete cookies when closing the browser</li>
              <li>Manage site-specific cookie preferences</li>
            </ul>
            <p className="mt-4">
              Please note that disabling cookies may affect the functionality of our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Cookie Consent</h2>
            <p>
              We ask for your consent before placing non-essential cookies on your device. 
              You can withdraw your consent at any time through your account settings or by 
              contacting us at privacy@betxpesa.com.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Do Not Track</h2>
            <p>
              Some browsers include a "Do Not Track" feature. Our website currently does not 
              respond to Do Not Track signals, but we provide you with choices regarding the 
              collection and use of information as described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our 
              cookie practices. We encourage you to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, please contact us at:
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
