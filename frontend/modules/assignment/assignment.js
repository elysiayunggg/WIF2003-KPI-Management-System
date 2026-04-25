function selectPerson(card) {
  // Remove selected class from all person cards
  document.querySelectorAll(".person-card").forEach(c => {
    c.classList.remove("selected");
  });
  // Add selected class to clicked card
  card.classList.add("selected");
}