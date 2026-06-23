const steps = Array.from(document.querySelectorAll('.step'));
const continueButtons = {
  0: document.getElementById('continueButton'),
  1: document.getElementById('continueButton1'),
  2: document.getElementById('continueButton2'),
  3: document.getElementById('continueButton3'),
  4: document.getElementById('continueButton4'),
  5: document.getElementById('continueButton5'),
};
const revealMemoryButton = document.getElementById('revealMemory');
const memoryImage = document.getElementById('memoryImage');
const showPlaylistButton = document.getElementById('showPlaylist');
const playlistLink = document.getElementById('playlistLink');
const surpriseReveal = document.getElementById('surpriseReveal');
const surpriseList = document.getElementById('surpriseList');
const quizOptions = document.getElementById('quizOptions');
const quizAnswer = document.getElementById('quizAnswer');
const quizButtons = Array.from(document.querySelectorAll('.quiz-options button'));

let currentStep = 0;

function setStep(stepIndex) {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === stepIndex);
    if (index === stepIndex) {
      const bg = step.getAttribute('data-bg');
      if (bg) document.body.style.background = bg;
    }
  });
}

function showElement(element) {
  if (element) element.classList.remove('hidden');
}

function hideElement(element) {
  if (element) element.classList.add('hidden');
}

function resetInteractiveState() {
  hideElement(memoryImage);
  hideElement(playlistLink);
  hideElement(surpriseList);
  hideElement(quizAnswer);
  quizButtons.forEach((button) => {
    button.classList.remove('correct', 'incorrect');
  });
}

function goToStep(index) {
  const validIndex = Math.max(0, Math.min(index, steps.length - 1));
  currentStep = validIndex;
  setStep(currentStep);
}

function typeText(element, text) {
  return new Promise((resolve) => {
    if (!element || !text) {
      resolve();
      return;
    }

    element.textContent = '';
    let position = 0;
    const speed = 35;

    const typeInterval = setInterval(() => {
      element.textContent += text[position] || '';
      position += 1;
      if (position > text.length) {
        clearInterval(typeInterval);
        resolve();
      }
    }, speed);
  });
}

async function activateStep(stepIndex) {
  goToStep(stepIndex);
  resetInteractiveState();

  const activeStep = steps[stepIndex];
  const textElement = activeStep.querySelector('.typed-text');
  const text = textElement?.dataset.text || '';

  await typeText(textElement, text);

  switch (stepIndex) {
    case 0:
      showElement(continueButtons[0]);
      break;
    case 1:
      showElement(revealMemoryButton);
      break;
    case 2:
      showElement(continueButtons[2]);
      break;
    case 3:
      showElement(showPlaylistButton);
      break;
    case 4:
      showElement(surpriseReveal);
      break;
    case 5:
      showElement(quizOptions);
      break;
    default:
      break;
  }
}

function advanceStep() {
  activateStep(currentStep + 1);
}

Object.values(continueButtons).forEach((button) => {
  if (!button) return;
  button.addEventListener('click', advanceStep);
});

const backButton = document.getElementById('backButton');
if (backButton) {
  backButton.addEventListener('click', () => {
    window.history.back();
  });
}

if (revealMemoryButton) {
  revealMemoryButton.addEventListener('click', () => {
    showElement(memoryImage);
    showElement(continueButtons[1]);
  });
}

if (showPlaylistButton) {
  showPlaylistButton.addEventListener('click', () => {
    showElement(playlistLink);
    showElement(continueButtons[3]);
  });
}

if (surpriseReveal) {
  surpriseReveal.addEventListener('click', () => {
    showElement(surpriseList);
    showElement(continueButtons[4]);
  });
}

quizButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const isCorrect = button.textContent.trim() === 'Music';

    quizButtons.forEach((btn) => {
      btn.classList.remove('correct', 'incorrect');
    });

    button.classList.add(isCorrect ? 'correct' : 'incorrect');
    if (quizAnswer) {
      quizAnswer.textContent = isCorrect
        ? 'Yes! It was music and our late-night messages that made us click.'
        : 'Close! Our first connection really sparked over talking about music.';
      showElement(quizAnswer);
      showElement(continueButtons[5]);
    }
  });
});

activateStep(0);
