const options = document.querySelectorAll('.quiz-options button');
const answerText = document.querySelector('.quiz-answer');
const revealButton = document.querySelector('.reveal-button');
const revealList = document.querySelector('.reveal-list');

const correctAnswer = 'Music';

options.forEach((button) => {
  button.addEventListener('click', () => {
    const isCorrect = button.textContent === correctAnswer;
    answerText.textContent = isCorrect
      ? 'Yes! It was music and our late-night messages that made us click.'
      : 'Close! Our first connection really sparked over talking about music.';

    options.forEach((btn) => btn.classList.remove('selected', 'correct', 'incorrect'));
    button.classList.add(isCorrect ? 'correct' : 'incorrect');
  });
});

if (revealButton && revealList) {
  revealButton.addEventListener('click', () => {
    revealList.classList.toggle('hidden');
    revealButton.textContent = revealList.classList.contains('hidden')
      ? 'Reveal the surprise'
      : 'Hide the surprise';
  });
}
