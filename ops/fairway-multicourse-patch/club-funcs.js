function getClubContacts() {
  const id = state.setup && state.setup.courseId;
  if (!id) return null;
  return CLUB_CONTACTS[id] || null;
}

function updateClubCalls() {
  const contacts = getClubContacts();
  const show = !!contacts;
  const box = document.getElementById("scClubCalls");
  const caddie = document.getElementById("scCallCaddie");
  const rest = document.getElementById("scCallRest");
  const hBox = document.getElementById("holeClubCalls");
  const hC = document.getElementById("holeCallCaddie");
  const hR = document.getElementById("holeCallRest");
  if (box) box.hidden = !show;
  if (hBox) hBox.hidden = !show;
  if (!show || !contacts) {
    if (rest) rest.hidden = true;
    if (hR) hR.hidden = true;
    return;
  }
  if (caddie && contacts.caddie) {
    caddie.hidden = false;
    caddie.href = "tel:" + contacts.caddie.tel;
    caddie.innerHTML = '<span class="call-mark" aria-hidden="true"></span>' + (contacts.caddie.label || "Caddie master");
  }
  const hasRest = !!(contacts.restaurant && contacts.restaurant.tel);
  if (rest) {
    rest.hidden = !hasRest;
    if (hasRest) {
      rest.href = "tel:" + contacts.restaurant.tel;
      rest.innerHTML = '<span class="call-mark" aria-hidden="true"></span>' + (contacts.restaurant.label || "Restaurante");
    }
  }
  if (hC && contacts.caddie) {
    hC.hidden = false;
    hC.href = "tel:" + contacts.caddie.tel;
    hC.innerHTML = '<span class="call-mark" aria-hidden="true"></span>' + (contacts.caddie.label || "Caddie master");
  }
  if (hR) {
    hR.hidden = !hasRest;
    if (hasRest) {
      hR.href = "tel:" + contacts.restaurant.tel;
      hR.innerHTML = '<span class="call-mark" aria-hidden="true"></span>' + (contacts.restaurant.label || "Restaurante");
    }
  }
}