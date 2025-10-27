import { PopupModal } from "react-calendly";

export default function CalendlyBooking({ url, isOpen, setOpen }) {
  const rootElement = document.getElementById("root") || document.body;

  if (!isOpen || !url || !rootElement) return null;

  return (
    <PopupModal
      url={url}
      open={isOpen}
      onModalClose={() => setOpen(false)}
      rootElement={rootElement}
      pageSettings={{
        primaryColor: "CAA100",
        textColor: "333333",
        backgroundColor: "ffffff",
        hideEventTypeDetails: false,
        hideLandingPageDetails: false,
      }}
    />
  );
}
