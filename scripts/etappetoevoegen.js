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

  // Setup navigation buttons
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', function() {
      const target = this.getAttribute('data-nav');
      if (target) {
        window.location.href = target;
      }
    });
  });

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
        // All riders matched - show preview instead of importing directly
        validatedResults = result.results;
        showPreview(result.results);
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

  // Show preview of validated results
  function showPreview(results) {
    const validationResults = document.getElementById('validation-results');
    const validationSuccess = document.getElementById('validation-success');
    const validationErrors = document.getElementById('validation-errors');
    const previewSection = document.getElementById('preview-section');
    const previewTableBody = document.getElementById('preview-table-body');

    if (!validationResults || !validationSuccess || !previewSection || !previewTableBody) {
      console.error('Required DOM elements not found for preview');
      return;
    }

    // Show validation success and preview
    validationResults.style.display = 'block';
    validationSuccess.style.display = 'block';
    validationErrors.style.display = 'none';
    previewSection.style.display = 'block';

    // Clear previous preview
    previewTableBody.innerHTML = '';

    // Helper function to format time from seconds
    function formatTime(seconds) {
      if (seconds === null || seconds === undefined) {
        return '-';
      }
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      } else {
        return `${minutes}:${String(secs).padStart(2, '0')}`;
      }
    }

    // Populate preview table
    results.forEach(result => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${result.position}</td>
        <td>${sanitizeInput(result.matchedName || `${result.firstName} ${result.lastName}`)}</td>
        <td>${formatTime(result.timeSeconds)}</td>
      `;
      previewTableBody.appendChild(row);
    });
  }

  // Import results directly (when export button is clicked)
  async function importResultsDirectly(resultsToImport) {
    if (!resultsToImport || !currentStageId) {
      alert('Geen gevalideerde resultaten om te importeren');
      return;
    }

    const validationResults = document.getElementById('validation-results');
    const validationSuccess = document.getElementById('validation-success');
    const validationErrors = document.getElementById('validation-errors');
    const importSuccess = document.getElementById('import-success');

    if (!validationResults || !validationSuccess || !validationErrors || !importSuccess) {
      console.error('Required DOM elements not found:', {
        validationResults: !!validationResults,
        validationSuccess: !!validationSuccess,
        validationErrors: !!validationErrors,
        importSuccess: !!importSuccess
      });
      alert('Fout: vereiste elementen niet gevonden op de pagina');
      return;
    }

    // Show loading state
    const previewSection = document.getElementById('preview-section');
    const exportButton = document.getElementById('export-button');
    
    validationResults.style.display = 'block';
    validationSuccess.style.display = 'block';
    validationErrors.style.display = 'none';
    
    // Disable export button and show loading
    if (exportButton) {
      exportButton.disabled = true;
      const buttonText = exportButton.querySelector('span');
      if (buttonText) {
        buttonText.textContent = 'Bezig met importeren...';
      }
    }
    
    const successMessage = validationSuccess.querySelector('.validation-success-message p');
    if (successMessage) {
      successMessage.textContent = 'Data wordt geïmporteerd...';
    }

    try {
      
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


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        validationSuccess.style.display = 'none';
        validationErrors.style.display = 'block';
        alert('Er is een fout opgetreden bij het importeren: ' + (errorData.error || 'Onbekende fout'));
        return;
      }

      const result = await response.json();

      if (result.ok) {
        
        // Hide preview section
        if (previewSection) {
          previewSection.style.display = 'none';
        }
        
        validationResults.style.display = 'none';
        validationSuccess.style.display = 'none';
        importSuccess.style.display = 'block';
        
        // Show message about replacement if applicable
        const successMessage = importSuccess.querySelector('.import-success-message p');
        if (successMessage && result.replacedExisting) {
          successMessage.textContent = `Uitslag succesvol geïmporteerd! ${result.existingCount} bestaande resultaten zijn overschreven.`;
        }

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
  const exportButton = document.getElementById('export-button');
  const stageSelect = document.getElementById('stage-select');

  if (validateButton) {
    validateButton.addEventListener('click', validateResults);
  }

  if (retryValidateButton) {
    retryValidateButton.addEventListener('click', retryValidation);
  }

  if (exportButton) {
    exportButton.addEventListener('click', async function() {
      if (validatedResults && currentStageId) {
        await importResultsDirectly(validatedResults);
      } else {
        alert('Geen gevalideerde resultaten om te exporteren');
      }
    });
  }

  // Reset currentStageId when stage select changes
  if (stageSelect) {
    stageSelect.addEventListener('change', function() {
      currentStageId = null;
      validatedResults = null;
    });
  }

  // Load stages on page load
  await loadStagesWithoutResults();
});

