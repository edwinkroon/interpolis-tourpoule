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
  let originalResultsText = null;

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
    originalResultsText = resultsText; // Store original text
    
    console.log('Validating results for stageId:', currentStageId, 'from select value:', stageId);

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

      // Check if response is ok
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server error: ${response.status} ${response.statusText}` };
        }
        
        validationResults.style.display = 'block';
        validationSuccess.style.display = 'none';
        validationErrors.style.display = 'block';
        
        const errorsList = document.getElementById('validation-errors-list');
        if (errorsList) {
          errorsList.innerHTML = '';
          const errorItem = document.createElement('div');
          errorItem.className = 'validation-error-item';
          errorItem.innerHTML = `
            <div class="validation-error-message">Fout bij valideren: ${sanitizeInput(errorData.error || 'Onbekende fout')}</div>
            ${errorData.hint ? `<div class="validation-error-message" style="font-size: 12px; margin-top: 0.5rem; color: #668494;">${sanitizeInput(errorData.hint)}</div>` : ''}
            ${errorData.details ? `<div class="validation-error-message" style="font-size: 11px; margin-top: 0.5rem; color: #9ca3af; font-family: monospace;">${sanitizeInput(errorData.details)}</div>` : ''}
          `;
          errorsList.appendChild(errorItem);
        }
        return;
      }

      const result = await response.json();

      validationResults.style.display = 'block';

      if (result.ok && result.valid) {
        // All riders matched - import directly
        validatedResults = result.results;
        await importResultsDirectly(result.results);
      } else {
        // Some riders didn't match - show errors and editable textarea
        validatedResults = null;
        validationSuccess.style.display = 'none';
        validationErrors.style.display = 'block';

        const errorsList = document.getElementById('validation-errors-list');
        const unmatchedTextarea = document.getElementById('unmatched-results-textarea');
        
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

        // Populate editable textarea with unmatched results
        if (unmatchedTextarea && result.unmatchedText) {
          unmatchedTextarea.value = result.unmatchedText;
        }
      }
    } catch (error) {
      console.error('Error validating results:', error);
      alert('Er is een fout opgetreden bij het valideren: ' + error.message);
    }
  }

  // Import results directly (when all riders matched)
  async function importResultsDirectly(resultsToImport) {
    if (!resultsToImport || !currentStageId) {
      alert('Geen gevalideerde resultaten om te importeren');
      return;
    }

    const validationResults = document.getElementById('validation-results');
    const validationSuccess = document.getElementById('validation-success');
    const validationErrors = document.getElementById('validation-errors');
    const importSuccess = document.getElementById('import-success');

    // Show loading state
    validationResults.style.display = 'block';
    validationSuccess.style.display = 'block';
    validationErrors.style.display = 'none';
    
    const successMessage = validationSuccess.querySelector('.validation-success-message p');
    if (successMessage) {
      successMessage.textContent = 'Alle renners zijn succesvol gemapped. Data wordt geïmporteerd...';
    }

    try {
      console.log('Importing results for stageId:', currentStageId);
      console.log('Number of results:', resultsToImport.length);
      
      const response = await fetch('/.netlify/functions/import-stage-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stageId: currentStageId,
          results: resultsToImport.map(r => ({
            position: r.position,
            riderId: r.riderId,
            timeSeconds: r.timeSeconds
          }))
        })
      });

      const result = await response.json();

      if (result.ok) {
        console.log('Import successful for stageId:', currentStageId);
        validationResults.style.display = 'none';
        validationSuccess.style.display = 'none';
        importSuccess.style.display = 'block';

        // Reset form
        document.getElementById('results-textarea').value = '';
        const stageSelect = document.getElementById('stage-select');
        if (stageSelect) {
          stageSelect.value = '';
        }
        validatedResults = null;
        const importedStageId = currentStageId; // Store before resetting
        currentStageId = null;
        
        // Reload stages (the imported stage should no longer appear)
        setTimeout(() => {
          loadStagesWithoutResults();
        }, 1000);
      } else {
        validationSuccess.style.display = 'none';
        validationErrors.style.display = 'block';
        alert('Er is een fout opgetreden bij het importeren: ' + (result.error || 'Onbekende fout'));
      }
    } catch (error) {
      console.error('Error importing results:', error);
      validationSuccess.style.display = 'none';
      validationErrors.style.display = 'block';
      alert('Er is een fout opgetreden bij het importeren: ' + error.message);
    }
  }

  // Retry validation with edited unmatched results
  async function retryValidation() {
    const unmatchedTextarea = document.getElementById('unmatched-results-textarea');
    const resultsTextarea = document.getElementById('results-textarea');
    
    if (!unmatchedTextarea || !resultsTextarea) return;

    const editedUnmatchedText = unmatchedTextarea.value.trim();
    if (!editedUnmatchedText) {
      alert('Geen tekst om opnieuw te valideren');
      return;
    }

    // Use the edited text as the new input (user has corrected the unmatched riders)
    resultsTextarea.value = editedUnmatchedText;
    
    // Trigger validation with the corrected text
    await validateResults();
  }

  // Setup event listeners
  const validateButton = document.getElementById('validate-button');
  const retryValidateButton = document.getElementById('retry-validate-button');
  const stageSelect = document.getElementById('stage-select');

  if (validateButton) {
    validateButton.addEventListener('click', validateResults);
  }

  if (retryValidateButton) {
    retryValidateButton.addEventListener('click', retryValidation);
  }

  // Reset currentStageId when stage select changes
  if (stageSelect) {
    stageSelect.addEventListener('change', function() {
      currentStageId = null;
      validatedResults = null;
      console.log('Stage select changed, resetting currentStageId');
    });
  }

  // Load stages on page load
  await loadStagesWithoutResults();
});

