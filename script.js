// script.js
document.addEventListener('DOMContentLoaded', () => {
  // ——— Elements —————————————————————————————————————————
  const profileSection      = document.getElementById('profileSection');
  const trackerSection      = document.getElementById('trackerSection');
  const profileList         = document.getElementById('profileList');
  const profileNameEl       = document.getElementById('profileName');
  const backButton          = document.getElementById('backButton');
  const balanceEl           = document.getElementById('balance');
  const amountInput         = document.getElementById('amount');
  const typeSelect          = document.getElementById('type');
  const descriptionSelect   = document.getElementById('descriptionSelect');
  const descriptionCustom   = document.getElementById('descriptionCustom');
  const billAttachment      = document.getElementById('billAttachment');
  const attachmentPreview   = document.getElementById('attachmentPreview');
  const addButton           = document.getElementById('addButton');
  const toggleHistoryBtn    = document.getElementById('toggleHistoryBtn');
  const historyDiv          = document.getElementById('history');
  const historyContent      = document.getElementById('historyContent');
  const filterAllBtn        = document.getElementById('filterAllBtn');
  const filterCreditBtn     = document.getElementById('filterCreditBtn');
  const filterDebitBtn      = document.getElementById('filterDebitBtn');

  // Profile Modal
  const profileFab          = document.getElementById('profileFab');
  const profileModal        = document.getElementById('profileModal');
  const addProfileModalBtn  = document.getElementById('addProfileModalBtn');
  const editProfileModalBtn = document.getElementById('editProfileModalBtn');
  const deleteProfileModalBtn = document.getElementById('deleteProfileModalBtn');
  const recycleBinBtn       = document.getElementById('recycleBinBtn');
  const closeProfileModalBtn= document.getElementById('closeProfileModalBtn');

  // Recycle Bin Modal
  const recycleBinModal     = document.getElementById('recycleBinModal');
  const recycleList         = document.getElementById('recycleList');
  const closeRecycleModalBtn= document.getElementById('closeRecycleModalBtn');

  // Custom Input Modal
  const customModal         = document.getElementById('customModal');
  const customModalTitle    = document.getElementById('customModalTitle');
  const customModalInput    = document.getElementById('customModalInput');
  const customModalConfirmBtn = document.getElementById('customModalConfirmBtn');
  const customModalCancelBtn  = document.getElementById('customModalCancelBtn');

  // ——— State —————————————————————————————————————————————
  let profiles            = JSON.parse(localStorage.getItem('profiles') || '[]');
  let deletedProfiles     = JSON.parse(localStorage.getItem('deletedProfiles') || '[]');
  let currentProfile      = null;
  let currentFilter       = 'all';
  let sortNewestFirst     = true;  // for the new sort toggle
  let proofIndex          = null;

  // ——— Helpers: storage ————————————————————————————————
  const saveProfiles = () => localStorage.setItem('profiles', JSON.stringify(profiles));
  const saveDeleted  = () => localStorage.setItem('deletedProfiles', JSON.stringify(deletedProfiles));
  const getTxns      = () => JSON.parse(localStorage.getItem(currentProfile) || '[]');
  const saveTxns     = txns => localStorage.setItem(currentProfile, JSON.stringify(txns));

  // ——— Helpers: UI ——————————————————————————————————————
  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // ——— Confirm Modal (dynamic) ——————————————————————————
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal-overlay hidden';
  confirmModal.innerHTML = `
    <div class="modal-content">
      <h3 id="confirmModalTitle"></h3>
      <div class="modal-buttons">
        <button id="confirmYesBtn" class="btn">Yes</button>
        <button id="confirmNoBtn"  class="btn secondary">No</button>
      </div>
    </div>`;
  document.body.appendChild(confirmModal);

  const confirmTitle = confirmModal.querySelector('#confirmModalTitle');
  const confirmYes   = confirmModal.querySelector('#confirmYesBtn');
  const confirmNo    = confirmModal.querySelector('#confirmNoBtn');

  function showConfirm(message, onConfirm) {
    confirmTitle.textContent = message;
    confirmModal.classList.remove('hidden');
    confirmYes.onclick = () => {
      confirmModal.classList.add('hidden');
      onConfirm();
    };
    confirmNo.onclick = () => confirmModal.classList.add('hidden');
  }

  // ——— Sort Toggle Button ——————————————————————————————
  const sortBtn = document.createElement('button');
  sortBtn.className = 'filter-btn';
  const filtersDiv = document.querySelector('.filters');
  filtersDiv.appendChild(sortBtn);

  function updateSortBtn() {
    sortBtn.textContent = sortNewestFirst ? '↓' : '↑';
  }
  sortBtn.onclick = () => {
    sortNewestFirst = !sortNewestFirst;
    updateSortBtn();
    renderHistory();
  };
  updateSortBtn();

  // ——— Profile List ————————————————————————————————————
  function loadProfiles() {
    profileList.innerHTML = '';
    profiles.forEach(name => {
      const item = document.createElement('div');
      item.className = 'profile-item';
      item.textContent = name;
      item.onclick = () => openProfile(name);
      profileList.appendChild(item);
    });
  }

  function openProfile(name) {
    currentProfile = name;
    profileNameEl.textContent = name;
    profileSection.classList.add('hidden');
    trackerSection.classList.remove('hidden');
    historyDiv.classList.add('hidden');
    toggleHistoryBtn.textContent = 'Show History';
    currentFilter = 'all';
    activateFilter(filterAllBtn);
    clearInputs();
    refresh();
  }
  backButton.onclick = () => {
    trackerSection.classList.add('hidden');
    profileSection.classList.remove('hidden');
    currentProfile = null;
  };

  // ——— Custom Description & Attachment Preview —————————
  descriptionSelect.onchange = () => {
    if (descriptionSelect.value === 'Other') {
      descriptionCustom.classList.remove('hidden');
    } else {
      descriptionCustom.classList.add('hidden');
      descriptionCustom.value = '';
    }
  };
  billAttachment.onchange = () => {
    const file = billAttachment.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        attachmentPreview.src = reader.result;
        attachmentPreview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      clearAttachmentPreview();
    }
  };
  function clearAttachmentPreview() {
    attachmentPreview.src = '';
    attachmentPreview.classList.add('hidden');
  }
  function clearInputs() {
    amountInput.value = '';
    typeSelect.value = 'credit';
    descriptionSelect.value = '';
    descriptionCustom.value = '';
    descriptionCustom.classList.add('hidden');
    billAttachment.value = '';
    clearAttachmentPreview();
  }

  // ——— Add Transaction & Save ————————————————————————
  function addTransaction() {
    const amt  = parseFloat(amountInput.value);
    const desc = descriptionSelect.value === 'Other'
      ? descriptionCustom.value.trim()
      : descriptionSelect.value;
    if (isNaN(amt) || !desc) {
      alert('Please enter amount and description');
      return;
    }
    const txn = {
      amount: typeSelect.value === 'debit' ? -Math.abs(amt) : Math.abs(amt),
      description: desc,
      date: new Date().toLocaleString(),
      timestamp: Date.now(),
      file: null
    };
    const file = billAttachment.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        txn.file = reader.result;
        doSave(txn);
      };
      reader.readAsDataURL(file);
    } else {
      doSave(txn);
    }
  }
  function doSave(txn) {
    const txns = getTxns();
    txns.push(txn);
    saveTxns(txns);
    clearInputs();
    refresh();
    showToast('Transaction added');
  }
  addButton.onclick = addTransaction;

  // ——— Balance & History Rendering —————————————————————
  function renderBalance() {
    const total = getTxns().reduce((s, t) => s + t.amount, 0);
    balanceEl.textContent = `Balance: ₹${total.toFixed(2)}`;
    balanceEl.className = total >= 0 ? 'balance positive' : 'balance negative';
  }

  function renderHistory() {
    historyContent.innerHTML = '';
    let txns = getTxns().slice();
    txns.sort((a, b) => sortNewestFirst 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp
    );
    txns.forEach((t, i) => {
      const show = 
        currentFilter === 'credit' ? t.amount > 0 :
        currentFilter === 'debit'  ? t.amount < 0 :
        true;
      if (!show) return;
      const item = document.createElement('div');
      item.className = `history-item ${t.amount<0?'debit':'credit'}`;
      item.innerHTML = `
        <div class="history-main">
          <span class="history-desc">${t.description}</span>
          <span class="history-amount ${t.amount<0?'debit':'credit'}">
            ${t.amount<0?'-':'+'}₹${Math.abs(t.amount).toFixed(2)}
          </span>
        </div>
        <div class="history-meta">
          <span class="history-date">${t.date}</span>
          <span class="proof-col">
            ${t.file
              ? `<button class="view-proof-btn history-edit-btn" data-idx="${i}">
                   View Proof
                 </button>` : ''}
          </span>
        </div>`;
      historyContent.appendChild(item);
    });
  }

  function refresh() {
    renderBalance();
    if (!historyDiv.classList.contains('hidden')) {
      renderHistory();
    }
  }

  toggleHistoryBtn.onclick = () => {
    const isHidden = historyDiv.classList.toggle('hidden');
    if (!isHidden) {
      toggleHistoryBtn.textContent = 'Hide History';
      renderHistory();
    } else {
      toggleHistoryBtn.textContent = 'Show History';
    }
  };

  [filterAllBtn, filterCreditBtn, filterDebitBtn].forEach(btn => {
    btn.onclick = () => {
      currentFilter = btn === filterCreditBtn
        ? 'credit' 
        : btn === filterDebitBtn
          ? 'debit'
          : 'all';
      activateFilter(btn);
      renderHistory();
    };
  });

  function activateFilter(activeBtn) {
    [filterAllBtn, filterCreditBtn, filterDebitBtn]
      .forEach(b => b.classList.toggle('active', b === activeBtn));
  }

  // ——— Proof Modal ————————————————————————————————————
  const proofModal      = document.getElementById('proofModal');
  const proofImage      = document.getElementById('proofImage');
  const saveProofBtn    = document.getElementById('saveProofBtn');
  const editProofBtn    = document.getElementById('editProofBtn');
  const closeProofModal = document.getElementById('closeProofModalBtn');

  document.addEventListener('click', e => {
    if (e.target.classList.contains('view-proof-btn')) {
      proofIndex = Number(e.target.dataset.idx);
      proofImage.src = getTxns()[proofIndex].file;
      proofModal.classList.remove('hidden');
    }
  });
  closeProofModal.onclick = () => proofModal.classList.add('hidden');
  saveProofBtn.onclick = () => {
    const a = document.createElement('a');
    a.href = proofImage.src;
    a.download = `proof_${Date.now()}.png`;
    a.click();
  };
  editProofBtn.onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const file = inp.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const txns = getTxns();
        txns[proofIndex].file = reader.result;
        saveTxns(txns);
        proofImage.src = reader.result;
        renderHistory();
      };
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  // ——— Profile Manager ——————————————————————————————
  profileFab.onclick = () => profileModal.classList.remove('hidden');
  closeProfileModalBtn.onclick = () => profileModal.classList.add('hidden');

  // Add Profile
  addProfileModalBtn.onclick = () => {
    customModalTitle.textContent = 'New Profile Name';
    customModalInput.value = '';
    customModalInput.placeholder = 'Enter name';
    customModal.classList.remove('hidden');
    customModalConfirmBtn.onclick = () => {
      const nm = customModalInput.value.trim();
      if (nm && !profiles.includes(nm)) {
        profiles.push(nm);
        saveProfiles();
        loadProfiles();
        customModal.classList.add('hidden');
        showToast('Profile added');
      } else {
        showToast('Name exists or is empty');
      }
    };
    customModalCancelBtn.onclick = () => customModal.classList.add('hidden');
  };

  // Edit Profile
  editProfileModalBtn.onclick = () => {
    if (!currentProfile) return showToast('Select a profile first');
    customModalTitle.textContent = 'Rename Profile';
    customModalInput.value = currentProfile;
    customModalInput.placeholder = 'Enter new name';
    customModal.classList.remove('hidden');
    customModalConfirmBtn.onclick = () => {
      const nm = customModalInput.value.trim();
      if (nm && !profiles.includes(nm)) {
        const idx = profiles.indexOf(currentProfile);
        profiles[idx] = nm;
        const data = localStorage.getItem(currentProfile);
        if (data) {
          localStorage.setItem(nm, data);
          localStorage.removeItem(currentProfile);
        }
        currentProfile = nm;
        profileNameEl.textContent = nm;
        saveProfiles();
        loadProfiles();
        customModal.classList.add('hidden');
        showToast('Profile renamed');
      } else {
        showToast('Invalid or duplicate name');
      }
    };
    customModalCancelBtn.onclick = () => customModal.classList.add('hidden');
  };

  // Delete Profile
  deleteProfileModalBtn.onclick = () => {
    if (!currentProfile) return showToast('Select a profile first');
    showConfirm(`Delete profile “${currentProfile}”?`, () => {
      profiles = profiles.filter(n => n !== currentProfile);
      deletedProfiles.push(currentProfile);
      saveProfiles();
      saveDeleted();
      loadProfiles();
      trackerSection.classList.add('hidden');
      profileSection.classList.remove('hidden');
      showToast('Moved to Recycle Bin');
    });
    profileModal.classList.add('hidden');
  };

  // Recycle Bin
  recycleBinBtn.onclick = () => {
    recycleBinModal.classList.remove('hidden');
    recycleList.innerHTML = '';
    deletedProfiles.forEach(name => {
      const itm = document.createElement('div');
      itm.className = 'profile-item';
      itm.textContent = name;
      itm.onclick = () => {
        showConfirm(`Restore profile “${name}”?`, () => {
          profiles.push(name);
          deletedProfiles = deletedProfiles.filter(p => p !== name);
          saveProfiles();
          saveDeleted();
          loadProfiles();
          showToast('Profile restored');
          recycleBinModal.classList.add('hidden');
        });
      };
      recycleList.appendChild(itm);
    });
  };
  closeRecycleModalBtn.onclick = () => recycleBinModal.classList.add('hidden');

  // ——— Init —————————————————————————————————————————————
  loadProfiles();
});
