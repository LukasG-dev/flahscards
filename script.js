// 1. Select elements from the HTML
const frontTextInput = document.getElementById("frontText");
const backTextInput = document.getElementById("backText");
const addCardBtn = document.getElementById("addCardBtn");
const flashcardsContainer = document.getElementById("flashcardsContainer");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const darkModeToggle = document.getElementById("darkModeToggle");

// Array to store flashcards
let flashcards = [];

// Function to toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  // Save current mode preference to localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("darkMode", "enabled");
  } else {
    localStorage.setItem("darkMode", "disabled");
  }
}

// Function to apply dark mode based on saved preference
function applySavedDarkMode() {
  const savedMode = localStorage.getItem("darkMode");
  if (savedMode === "enabled") {
    document.body.classList.add("dark-mode");
  }
}

// 2. Function to add a new card
function addFlashcard() {
  const frontText = frontTextInput.value.trim();
  const backText = backTextInput.value.trim();

  // Check if both fields are filled
  if (frontText === "" || backText === "") {
    alert("Please enter text for both the front and back of the card.");
    return;
  }

  const newCard = { front: frontText, back: backText };
  flashcards.push(newCard);
  saveFlashcards();
  renderFlashcards();

  // Clear input fields
  frontTextInput.value = "";
  backTextInput.value = "";
  frontTextInput.focus();
}

// 3. Function to save cards to localStorage
function saveFlashcards() {
  localStorage.setItem("flashcards", JSON.stringify(flashcards));
}

// 4. Function to load cards from localStorage
function loadFlashcards() {
  const storedFlashcards = localStorage.getItem("flashcards");
  if (storedFlashcards) {
    flashcards = JSON.parse(storedFlashcards);
  }
  renderFlashcards();
}

// 5. Function to render (display) all cards in the main container
function renderFlashcards() {
  flashcardsContainer.innerHTML = "";

  flashcards.forEach((card, index) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("flashcard");

    const frontParagraph = document.createElement("p");
    frontParagraph.classList.add("card-front");
    frontParagraph.textContent = card.front;

    const backParagraph = document.createElement("p");
    backParagraph.classList.add("card-back");
    backParagraph.textContent = card.back;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-card-btn");
    deleteButton.onclick = () => deleteFlashcard(index);

    cardElement.appendChild(frontParagraph);
    cardElement.appendChild(backParagraph);
    cardElement.appendChild(deleteButton);

    flashcardsContainer.appendChild(cardElement);
  });
}

// Function to delete a card
function deleteFlashcard(indexToDelete) {
  flashcards.splice(indexToDelete, 1);
  saveFlashcards();
  renderFlashcards();
}

/**
 * Helper function that waits until the jsPDF library is loaded.
 * Repeatedly checks for window.jspdf.
 * @returns {Promise<Object>} The jsPDF module once it's loaded.
 */
function waitForJsPDF() {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50; // Max. 50 attempts (50 * 100ms = 5 seconds wait time)
    let attempts = 0;
    const intervalTime = 100; // Check every 100ms

    const checkJsPDF = () => {
      // Check if window.jspdf exists and if it contains the expected jsPDF object
      if (window.jspdf && typeof window.jspdf.jsPDF !== "undefined") {
        resolve(window.jspdf); // Found, resolve the Promise successfully
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkJsPDF, intervalTime); // Keep checking
      } else {
        // Timeout, reject the Promise with an error
        reject(
          new Error("jsPDF library did not load within the expected time.")
        );
      }
    };

    checkJsPDF(); // Start the first check
  });
}

// 6. Function to generate the PDF using jsPDF for precise control
async function generatePdf() {
  console.log("generatePdf-function started.");

  let jsPDFModule;
  try {
    // Here we wait until jsPDF is truly available
    jsPDFModule = await waitForJsPDF();
    console.log("DEBUG: jsPDF library successfully loaded and available.");
  } catch (error) {
    alert(
      error.message +
        "\nPlease try again or check your internet connection/local paths."
    );
    console.error("ERROR: jsPDF could not be loaded.", error);
    return;
  }

  // If execution reaches here, jsPDFModule is definitely defined and contains the loaded object
  const { jsPDF } = jsPDFModule;

  // ***************************************************************
  // Set A4 page to PORTRAIT (vertical)
  // ***************************************************************
  const doc = new jsPDF({
    orientation: "portrait", // A4 now in portrait mode
    unit: "mm",
    format: "a4",
  });

  // ***************************************************************
  // Calculations for A4 Portrait and two A5 Landscape cards, one below the other
  // ***************************************************************
  const a4Width = doc.internal.pageSize.getWidth(); // 210 mm for A4 Portrait
  const a4Height = doc.internal.pageSize.getHeight(); // 297 mm for A4 Portrait

  // A5 Landscape dimensions: ~210mm (width) x ~148.5mm (height)
  // Each card should take the full width of the A4 sheet (210mm).
  // Each card should take half the height of the A4 sheet (148.5mm).
  const cardPrintWidth = a4Width;
  const cardPrintHeight = a4Height / 2;

  const margin = 10; // Margin around the text within the card

  /**
   * Helper function to draw text within a defined area on the PDF page,
   * handling text wrapping and centering.
   * @param {string} text - The text to be drawn.
   * @param {number} x - The X-coordinate of the starting point of the area.
   * @param {number} y - The Y-coordinate of the starting point of the area.
   * @param {number} width - The width of the text area.
   * @param {number} height - The height of the text area.
   */
  const drawCardText = (text, x, y, width, height) => {
    doc.setFontSize(20); // Font size for card text
    doc.setTextColor(0, 0, 0); // Black text color

    // Wrap text to fit within the card width (minus margins)
    const lines = doc.splitTextToSize(text, width - 2 * margin);
    const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;

    // Calculate vertical position to center text within the card area
    const textHeight = lines.length * lineHeight;
    const textY = y + height / 2 - textHeight / 2; // Vertically centered

    doc.text(lines, x + margin, textY, { align: "center" }); // Horizontally centered within the margin
    console.log(
      `DEBUG: Text drawn: "${text.substring(
        0,
        Math.min(text.length, 30)
      )}" at x:${x}, y:${y}`
    );
  };

  console.log(`DEBUG: Number of flashcards: ${flashcards.length}`);
  if (flashcards.length === 0) {
    alert("No flashcards to generate PDF for. Please add some cards first.");
    console.warn("DEBUG: No flashcards found, PDF generation aborted.");
    return;
  }

  // Iterate through flashcards, generating pages for front and back sides
  // Two cards per A4 page (one pair)
  for (let i = 0; i < flashcards.length; i += 2) {
    console.log(`DEBUG: Creating pages for card pair ${Math.floor(i / 2) + 1}`);

    // --- Front Sides Page (A4 Portrait) ---
    doc.addPage(); // Adds a new page for the front sides
    doc.setDrawColor(0); // Black color for borders
    doc.setLineWidth(0.2); // Thin border line

    // Card 1 Front (Top A5 Landscape position)
    const card1Front = flashcards[i];
    if (card1Front) {
      console.log(
        `DEBUG: Drawing front of card ${i + 1}: ${card1Front.front.substring(
          0,
          Math.min(card1Front.front.length, 20)
        )}...`
      );
      // doc.rect(x, y, width, height) to draw the card frame
      doc.rect(0, 0, cardPrintWidth, cardPrintHeight); // Top half of the A4 page
      drawCardText(card1Front.front, 0, 0, cardPrintWidth, cardPrintHeight);
    }

    // Card 2 Front (Bottom A5 Landscape position)
    const card2Front = flashcards[i + 1];
    if (card2Front) {
      console.log(
        `DEBUG: Drawing front of card ${i + 2}: ${card2Front.front.substring(
          0,
          Math.min(card2Front.front.length, 20)
        )}...`
      );
      doc.rect(0, cardPrintHeight, cardPrintWidth, cardPrintHeight); // Bottom half of the A4 page
      drawCardText(
        card2Front.front,
        0,
        cardPrintHeight,
        cardPrintWidth,
        cardPrintHeight
      );
    }

    // --- Back Sides Page (A4 Portrait) ---
    // This page is created after the front sides page to allow for double-sided printing.
    doc.addPage();
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);

    // Card 1 Back (Top A5 Landscape position, corresponds to Card 1 Front)
    if (card1Front) {
      console.log(
        `DEBUG: Drawing back of card ${i + 1}: ${card1Front.back.substring(
          0,
          Math.min(card1Front.back.length, 20)
        )}...`
      );
      doc.rect(0, 0, cardPrintWidth, cardPrintHeight);
      drawCardText(card1Front.back, 0, 0, cardPrintWidth, cardPrintHeight);
    }

    // Card 2 Back (Bottom A5 Landscape position, corresponds to Card 2 Front)
    if (card2Front) {
      console.log(
        `DEBUG: Drawing back of card ${i + 2}: ${card2Front.back.substring(
          0,
          Math.min(card2Front.back.length, 20)
        )}...`
      );
      doc.rect(0, cardPrintHeight, cardPrintWidth, cardPrintHeight);
      drawCardText(
        card2Front.back,
        0,
        cardPrintHeight,
        cardPrintWidth,
        cardPrintHeight
      );
    }
  }

  // Remove the very first blank page added by default by jsPDF.
  // This is only necessary if there were cards to generate.
  if (flashcards.length > 0) {
    console.log("DEBUG: Deleting first blank page.");
    doc.deletePage(1);
  } else {
    // This case should be caught by the earlier check, but it's an additional safeguard
    alert("No flashcards to generate PDF for. Please add some cards first.");
    console.warn("DEBUG: No flashcards found, PDF generation aborted.");
    return;
  }

  doc.save("flashcards.pdf");
  console.log("PDF generation successful with jsPDF!");
}

// Event Listeners: When should which function be executed?
addCardBtn.addEventListener("click", addFlashcard);
downloadPdfBtn.addEventListener("click", generatePdf);
darkModeToggle.addEventListener("click", toggleDarkMode);

// On page load: load existing cards and apply saved dark mode preference
document.addEventListener("DOMContentLoaded", () => {
  loadFlashcards();
  applySavedDarkMode();
});
