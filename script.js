// 1. Select elements from the HTML
const frontTextInput = document.getElementById("frontText");
const backTextInput = document.getElementById("backText");
const frontTitleInput = document.getElementById("frontTitle");
const backTitleInput = document.getElementById("backTitle");

const addCardBtn = document.getElementById("addCardBtn");
const flashcardsContainer = document.getElementById("flashcardsContainer");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const darkModeToggle = document.getElementById("darkModeToggle");

// Array to store flashcards
let flashcards = [];

// Function to toggle dark mode
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
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
  const frontTitle = frontTitleInput.value.trim();
  const backTitle = backTitleInput.value.trim();

  if (frontText === "" || backText === "") {
    alert("Please enter text for both the front and back of the card.");
    return;
  }

  const newCard = {
    frontTitle: frontTitle,
    front: frontText,
    backTitle: backTitle,
    back: backText,
  };
  flashcards.push(newCard);
  saveFlashcards();
  renderFlashcards();

  // Clear input fields
  frontTitleInput.value = "";
  backTitleInput.value = "";
  frontTextInput.value = "";
  backTextInput.value = "";
  frontTitleInput.focus();
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

    // Nummerierungs-Anzeige im Browser
    const numberSpan = document.createElement("span");
    numberSpan.classList.add("card-number");
    numberSpan.textContent = `Card ${index + 1}`;

    // Titel der Vorderseite anzeigen
    const frontTitleParagraph = document.createElement("p");
    frontTitleParagraph.classList.add("card-title", "front-title");
    frontTitleParagraph.textContent = card.frontTitle
      ? `Front Title: ${card.frontTitle}`
      : "";

    const frontParagraph = document.createElement("p");
    frontParagraph.classList.add("card-front");
    frontParagraph.textContent = card.front;

    // Titel der Rückseite anzeigen
    const backTitleParagraph = document.createElement("p");
    backTitleParagraph.classList.add("card-title", "back-title");
    backTitleParagraph.textContent = card.backTitle
      ? `Back Title: ${card.backTitle}`
      : "";

    const backParagraph = document.createElement("p");
    backParagraph.classList.add("card-back");
    backParagraph.textContent = card.back;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-card-btn");
    deleteButton.onclick = () => deleteFlashcard(index);

    cardElement.appendChild(numberSpan);
    cardElement.appendChild(frontTitleParagraph);
    cardElement.appendChild(frontParagraph);
    cardElement.appendChild(backTitleParagraph);
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
      if (window.jspdf && typeof window.jspdf.jsPDF !== "undefined") {
        resolve(window.jspdf);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkJsPDF, intervalTime);
      } else {
        reject(
          new Error("jsPDF library did not load within the expected time.")
        );
      }
    };
    checkJsPDF();
  });
}

// 6. Function to generate the PDF using jsPDF for precise control
async function generatePdf() {
  console.log("generatePdf-function started.");

  let jsPDFModule;
  try {
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

  const { jsPDF } = jsPDFModule;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const a4Width = doc.internal.pageSize.getWidth();
  const a4Height = doc.internal.pageSize.getHeight();

  // Jede Karteikarte nimmt die halbe A4-Höhe und die volle A4-Breite ein
  const cardPrintWidth = a4Width;
  const cardPrintHeight = a4Height / 2;

  const margin = 10; // Allgemeiner Rand für Inhalte innerhalb des Kartenbereichs
  const titleFontSize = 14; // Schriftgröße für Titel
  const numberFontSize = 10; // Schriftgröße für Nummerierung
  const baseContentFontSize = 20; // Basis-Schriftgröße für den Hauptinhalt

  /**
   * Helper function to draw content (main text, title, number) within a card area on the PDF.
   * Includes logic to resize font for long texts or truncate if necessary.
   * @param {string} mainText - The main content text to be drawn.
   * @param {string} cardTitle - The title specific to this side of the card (frontTitle or backTitle).
   * @param {number} overallCardNumber - The overall number of the card (e.g., 1, 2, 3...).
   * @param {number} sideNumber - The side number (1 for front, 2 for back).
   * @param {number} x - The X-coordinate of the starting point of the card area.
   * @param {number} y - The Y-coordinate of the starting point of the card area.
   * @param {number} width - The width of the card area.
   * @param {number} height - The height of the card area.
   */
  const drawCardContent = (
    mainText,
    cardTitle,
    overallCardNumber,
    sideNumber,
    x,
    y,
    width,
    height
  ) => {
    let currentY = y + margin; // Startpunkt für die erste Zeile (Nummerierung)

    // Nummerierung zeichnen
    doc.setFontSize(numberFontSize);
    doc.setTextColor(100, 100, 100); // Etwas helleres Grau für die Nummerierung
    doc.setFont("helvetica", "normal"); // Sicherstellen, dass die Nummerierung nicht fett ist
    doc.text(
      `Card ${overallCardNumber} - Side ${sideNumber}`,
      x + margin,
      currentY + numberFontSize / 2,
      { align: "left" }
    );
    currentY += numberFontSize + 2; // Abstand nach der Nummer

    // Titel zeichnen (falls vorhanden)
    if (cardTitle) {
      doc.setFontSize(titleFontSize);
      doc.setTextColor(50, 50, 50); // Dunkelgrau für den Titel
      doc.setFont("helvetica", "bold"); // Titel fett machen!

      const titleLines = doc.splitTextToSize(cardTitle, width - 2 * margin);
      const titleLineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
      doc.text(titleLines, x + width / 2, currentY + titleLineHeight / 2, {
        align: "center",
      });
      currentY += titleLines.length * titleLineHeight + 5; // Abstand nach dem Titel
    }

    // WICHTIG: Schriftart für den Haupttext wieder auf 'normal' setzen!
    // Sonst wäre auch der Haupttext fett, wenn ein Titel vorhanden war.
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0); // Schwarze Textfarbe für Hauptinhalt

    // Haupttext zeichnen
    // Berechne den verbleibenden Platz für den Haupttext
    const contentWidth = width - 2 * margin;
    const maxContentHeight = y + height - currentY - margin; // Von der aktuellen Y-Position bis zum unteren Rand der Karte

    let currentContentFontSize = baseContentFontSize; // Starte mit der Standard-Schriftgröße
    let lines = [];
    let textHeight = 0;

    // Versuche, die Schriftgröße zu reduzieren, bis der Text passt
    while (currentContentFontSize >= 8) {
      // Kleinste erlaubte Schriftgröße
      doc.setFontSize(currentContentFontSize);
      lines = doc.splitTextToSize(mainText, contentWidth);
      const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
      textHeight = lines.length * lineHeight;

      if (textHeight <= maxContentHeight) {
        // Text passt, breche Schleife ab
        break;
      }
      currentContentFontSize -= 1; // Schriftgröße um 1 Punkt reduzieren
    }

    // Wenn der Text immer noch nicht passt, abschneiden
    if (textHeight > maxContentHeight) {
      console.warn(
        `Text for Card ${overallCardNumber} Side ${sideNumber} is too long (${textHeight.toFixed(
          2
        )}mm > ${maxContentHeight.toFixed(
          2
        )}mm) even with smallest font size. Truncating.`
      );
      const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor;
      const maxLines = Math.floor(maxContentHeight / lineHeight);
      if (maxLines > 0) {
        lines = lines.slice(0, maxLines);
        // Füge "..." zur letzten Zeile hinzu, wenn abgeschnitten wurde
        if (
          lines.length > 0 &&
          lines.length < doc.splitTextToSize(mainText, contentWidth).length
        ) {
          lines[lines.length - 1] =
            lines[lines.length - 1].substring(
              0,
              lines[lines.length - 1].length - 3
            ) + "...";
        }
      } else {
        lines = ["..."]; // Wenn gar nichts passt, nur Ellipsen
      }
      textHeight = lines.length * lineHeight; // Aktualisierte Höhe nach dem Abschneiden
    }

    // Vertikale Position für Textzentrierung innerhalb des verbleibenden Inhaltsbereichs
    // (oder um ihn am oberen Rand zu beginnen, wenn er sehr lang ist)
    let textY = currentY + maxContentHeight / 2 - textHeight / 2;
    // Sicherstellen, dass der Text nicht über den oberen Rand des Haupttextbereichs ragt
    if (textY < currentY) {
      textY = currentY;
    }

    doc.text(lines, x + width / 2, textY, { align: "center" }); // Text an der Mitte der Karte zentrieren
    console.log(
      `DEBUG: Content drawn: "${mainText.substring(
        0,
        Math.min(mainText.length, 30)
      )}" (Font: ${currentContentFontSize}pt) for Card ${overallCardNumber} Side ${sideNumber} at x:${
        x + width / 2
      }, y:${textY}`
    );
  };

  console.log(`DEBUG: Number of flashcards: ${flashcards.length}`);
  if (flashcards.length === 0) {
    alert("No flashcards to generate PDF for. Please add some cards first.");
    console.warn("DEBUG: No flashcards found, PDF generation aborted.");
    return;
  }

  // Schleife zum Erstellen der PDF-Seiten
  for (let i = 0; i < flashcards.length; i += 2) {
    console.log(`DEBUG: Creating pages for card pair ${Math.floor(i / 2) + 1}`);

    // --- Vorderseiten-Seite (A4 Hochformat) ---
    doc.addPage();
    doc.setDrawColor(0); // Schwarze Rahmenfarbe
    doc.setLineWidth(0.2); // Rahmendicke

    const card1 = flashcards[i];
    if (card1) {
      const overallCardNumber1 = i + 1; // Gesamtkartennummer (beginnt bei 1)
      // Zeichne Vorderseite der ersten Karte (obere Hälfte der A4-Seite)
      doc.rect(0, 0, cardPrintWidth, cardPrintHeight);
      drawCardContent(
        card1.front,
        card1.frontTitle,
        overallCardNumber1,
        1,
        0,
        0,
        cardPrintWidth,
        cardPrintHeight
      );
    }

    const card2 = flashcards[i + 1];
    if (card2) {
      const overallCardNumber2 = i + 2; // Gesamtkartennummer
      // Zeichne Vorderseite der zweiten Karte (untere Hälfte der A4-Seite)
      doc.rect(0, cardPrintHeight, cardPrintWidth, cardPrintHeight);
      drawCardContent(
        card2.front,
        card2.frontTitle,
        overallCardNumber2,
        1,
        0,
        cardPrintHeight,
        cardPrintWidth,
        cardPrintHeight
      );
    }

    // --- Rückseiten-Seite (A4 Hochformat) ---
    doc.addPage();
    doc.setDrawColor(0); // Schwarze Rahmenfarbe
    doc.setLineWidth(0.2); // Rahmendicke

    if (card1) {
      const overallCardNumber1 = i + 1;
      // Zeichne Rückseite der ersten Karte (obere Hälfte der A4-Seite)
      doc.rect(0, 0, cardPrintWidth, cardPrintHeight);
      drawCardContent(
        card1.back,
        card1.backTitle,
        overallCardNumber1,
        2,
        0,
        0,
        cardPrintWidth,
        cardPrintHeight
      );
    }

    if (card2) {
      const overallCardNumber2 = i + 2;
      // Zeichne Rückseite der zweiten Karte (untere Hälfte der A4-Seite)
      doc.rect(0, cardPrintHeight, cardPrintWidth, cardPrintHeight);
      drawCardContent(
        card2.back,
        card2.backTitle,
        overallCardNumber2,
        2,
        0,
        cardPrintHeight,
        cardPrintWidth,
        cardPrintHeight
      );
    }
  }

  // Die erste leere Seite löschen, die jsPDF standardmäßig erstellt
  if (flashcards.length > 0) {
    console.log("DEBUG: Deleting first blank page.");
    doc.deletePage(1);
  } else {
    console.warn("DEBUG: No flashcards found, PDF generation aborted.");
    return;
  }

  // PDF speichern
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
