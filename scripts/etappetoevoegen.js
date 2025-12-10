// Load shared Auth0 utilities and utils
document.addEventListener('DOMContentLoaded', async function() {
  // Check if user is authenticated and exists in database
  const isAuthorized = await requireParticipant();
  if (!isAuthorized) {
    return; // Redirect will happen in requireParticipant
  }

  // Initialize Auth0
  await initAuth();

  let validatedResults = null;
  let currentStageId = null;

  // Load stages without results
  async function loadStagesWithoutResults() {
    const stageSelect = document.getElementById('stage-select');
    if (!stageSelect) return;

    stageSelect.innerHTML = '<option value="">-- Laden --</option>';

    try {
      const response = await fetch('/.netlify/functions/get-stages-without-results');
      const result = await response.json();

      if (!result.ok || !result.stages) {
        stageSelect.innerHTML = '<option value="">-- Geen etappes beschikbaar --</option>';
        return;
      }

      if (result.stages.length === 0) {
        stageSelect.innerHTML = '<option value="">-- Geen etappes zonder uitslag --</option>';
        return;
      }

      stageSelect.innerHTML = '<option value="">-- Selecteer etappe --</option>';
      result.stages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage.id;
        const stageLabel = `Etappe ${stage.stage_number}: ${stage.name}`;
        option.textContent = stageLabel;
        stageSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading stages:', error);
      stageSelect.innerHTML = '<option value="">-- Fout bij laden --</option>';
    }
  }

  // Validate results
  async function validateResults() {
    const stageSelect = document.getElementById('stage-select');
    const resultsTextarea = document.getElementById('results-textarea');
    const validationResults = document.getElementById('validation-results');
    const validationSuccess = document.getElementById('validation-success');
    const validationErrors = document.getElementById('validation-errors');
    const importSuccess = document.getElementById('import-success');

    if (!stageSelect || !resultsTextarea) return;

    const stageId = stageSelect.value;
    const resultsText = resultsTextarea.value.trim();

    // Reset display
    validationResults.style.display = 'none';
    validationSuccess.style.display = 'none';
    validationErrors.style.display = 'none';
    importSuccess.style.display = 'none';

    if (!stageId) {
      alert('Selecteer eerst een etappe');
      return;
    }

    if (!resultsText) {
      alert('Voer de uitslag in');
      return;
    }

    currentStageId = parseInt(stageId, 10);

    try {
      const response = await fetch('/.netlify/functions/validate-stage-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stageId: currentStageId,
          resultsText: resultsText
        })
      });

      const result = await response.json();

      validationResults.style.display = 'block';

      if (result.ok && result.valid) {
        validatedResults = result.results;
        validationSuccess.style.display = 'block';
        validationErrors.style.display = 'none';
      } else {
        validatedResults = null;
        validationSuccess.style.display = 'none';
        validationErrors.style.display = 'block';

        const errorsList = document.getElementById('validation-errors-list');
        if (errorsList) {
          errorsList.innerHTML = '';

          if (result.errors && result.errors.length > 0) {
            result.errors.forEach(error => {
              const errorItem = document.createElement('div');
              errorItem.className = 'validation-error-item';
              errorItem.innerHTML = `
                <div class="validation-error-line">Regel ${error.line}:</div>
                <div class="validation-error-content">${sanitizeInput(error.content)}</div>
                <div class="validation-error-message">${sanitizeInput(error.error)}</div>
              `;
              errorsList.appendChild(errorItem);
            });
          } else {
            const errorItem = document.createElement('div');
            errorItem.className = 'validation-error-item';
            errorItem.textContent = result.error || 'Onbekende fout bij validatie';
            errorsList.appendChild(errorItem);
          }

          if (result.validatedCount !== undefined && result.totalCount !== undefined) {
            const summaryItem = document.createElement('div');
            summaryItem.className = 'validation-error-summary';
            summaryItem.textContent = `Succesvol gevalideerd: ${result.validatedCount} van ${result.totalCount} renners`;
            errorsList.appendChild(summaryItem);
          }
        }
      }
    } catch (error) {
      console.error('Error validating results:', error);
      alert('Er is een fout opgetreden bij het valideren: ' + error.message);
    }
  }

  // Import results
  async function importResults() {
    if (!validatedResults || !currentStageId) {
      alert('Geen gevalideerde resultaten om te importeren');
      return;
    }

    const validationResults = document.getElementById('validation-results');
    const validationSuccess = document.getElementById('validation-success');
    const importSuccess = document.getElementById('import-success');

    try {
      const response = await fetch('/.netlify/functions/import-stage-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stageId: currentStageId,
          results: validatedResults.map(r => ({
            position: r.position,
            riderId: r.riderId,
            timeSeconds: r.timeSeconds
          }))
        })
      });

      const result = await response.json();

      if (result.ok) {
        validationResults.style.display = 'none';
        validationSuccess.style.display = 'none';
        importSuccess.style.display = 'block';

        // Reset form
        document.getElementById('results-textarea').value = '';
        validatedResults = null;
        currentStageId = null;
        
        // Reload stages (the imported stage should no longer appear)
        setTimeout(() => {
          loadStagesWithoutResults();
        }, 1000);
      } else {
        alert('Er is een fout opgetreden bij het importeren: ' + (result.error || 'Onbekende fout'));
      }
    } catch (error) {
      console.error('Error importing results:', error);
      alert('Er is een fout opgetreden bij het importeren: ' + error.message);
    }
  }

  // Setup event listeners
  const validateButton = document.getElementById('validate-button');
  const importButton = document.getElementById('import-button');

  if (validateButton) {
    validateButton.addEventListener('click', validateResults);
  }

  if (importButton) {
    importButton.addEventListener('click', importResults);
  }

  // Load stages on page load
  await loadStagesWithoutResults();
});

