export default function Footer() {
  return (
    <footer className="bg-amber-50 border-t border-amber-200 text-amber-900">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-12 grid md:grid-cols-3 gap-8">
        {/* Left — Branding */}
        <div>
          <h3 className="font-lora text-xl font-semibold">Golden Hour Cleaning Co.</h3>
          <p className="mt-2 text-sm text-amber-800/80 leading-relaxed">
            Meticulous care, mindful presence, and eco-friendly products —
            restoring the harmony of your home, one clean at a time.
          </p>
        </div>

        {/* Center — Contact Info */}
        <div>
          <h4 className="font-semibold mb-2">Contact</h4>
          <p className="text-sm">
            5441 S MACADAM AVE #4907<br />
            PORTLAND, OR, 97239, USA<br />
            <a href="tel:+15038934795" className="hover:text-amber-700">
              (503) 893-4795
            </a><br />
            <a href="mailto:golden.hour.cleaning.company@gmail.com" className="hover:text-amber-700">
              golden.hour.cleaning.company@gmail.com
            </a>
          </p>
          <p className="text-xs mt-3 text-amber-800/70">
            Licensed • Insured • Background-checked professionals
          </p>
        </div>

        {/* Right — Quick Links */}
        <div>
          <h4 className="font-semibold mb-2">Explore</h4>
          <ul className="space-y-1 text-sm">
            <li><a href="#services" className="hover:text-amber-700">Services</a></li>
            <li><a href="#quote" className="hover:text-amber-700">Get a Quote</a></li>
            <li><a href="#hero" className="hover:text-amber-700">About Us</a></li>
            {/* <li><a href="#contact" className="hover:text-amber-700">Contact</a></li> */}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-amber-100 text-center text-sm py-4 border-t border-amber-200">
        © {new Date().getFullYear()} Golden Hour Cleaning Co. All rights reserved.
      </div>
    </footer>
  );
}
