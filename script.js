let questions = [];
let randomizedQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedOption = null;
let currentSentence = [];
let matchedPairs = [];
let selectedMatch = null;
let fillBlankSelected = null;
let startTime;

const progressBar = document.getElementById('progress-bar');
const quizContainer = document.getElementById('quiz-container');
const questionContainer = document.getElementById('question-container');
const finalScreen = document.getElementById('final-screen');
const finalTitle = document.getElementById('final-title');
const questionTextElement = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const checkButton = document.getElementById('check-button');
const feedbackText = document.getElementById('feedback-text');
const fileInput = document.getElementById('file-input');
const uploadContainer = document.getElementById('upload-container');
const loadingScreen = document.getElementById('loading-screen');
const countdownScreen = document.getElementById('countdown-screen');
const countdownNumber = document.getElementById('countdown-number');

// Referencias a los elementos de audio
const correctSound = document.getElementById('correct-sound');
const incorrectSound = document.getElementById('incorrect-sound');
const finalSound = document.getElementById('final-sound');
const matchCorrectSound = document.getElementById('match-correct-sound');

fileInput.addEventListener('change', handleFile);

function handleFile(event) {
    const file = event.target.files[0];
    if (file) {
        showLoadingScreen();
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            try {
                questions = parseQuestions(content);
                if (questions.length > 0) {
                    setTimeout(() => {
                        startCountdown();
                    }, 2000);
                } else {
                    alert("El archivo no contiene preguntas válidas.");
                    hideLoadingScreen();
                }
            } catch (error) {
                alert("Error al procesar el archivo: " + error.message);
                hideLoadingScreen();
            }
        };
        reader.readAsText(file);
    }
}

function showLoadingScreen() {
    uploadContainer.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
}

function hideLoadingScreen() {
    loadingScreen.classList.add('hidden');
    uploadContainer.classList.remove('hidden');
}

function startCountdown() {
    loadingScreen.classList.add('hidden');
    countdownScreen.classList.remove('hidden');
    
    let count = 3;
    countdownNumber.textContent = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = count;
        } else {
            clearInterval(interval);
            countdownNumber.textContent = "¡Ya!";
            setTimeout(() => {
                startQuiz();
            }, 500);
        }
    }, 1000);
}

function parseQuestions(content) {
    const parsedQuestions = [];
    const lines = content.split('\n').filter(line => line.trim() !== '');
    let currentQuestion = {};

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('---')) {
            if (Object.keys(currentQuestion).length > 0) {
                parsedQuestions.push(currentQuestion);
                currentQuestion = {};
            }
            return;
        }

        const parts = trimmedLine.split(': ');
        if (parts.length < 2) return;

        const key = parts[0].trim();
        const value = parts.slice(1).join(': ').trim();

        if (key === 'type') {
            currentQuestion.type = value;
        } else if (key === 'question') {
            currentQuestion.question = value;
        } else if (key === 'options' || key === 'wordBank') {
            currentQuestion[key] = value.split(',').map(item => item.trim());
        } else if (key === 'correctAnswer') {
            if (value === 'true') {
                currentQuestion.correctAnswer = true;
            } else if (value === 'false') {
                currentQuestion.correctAnswer = false;
            } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
                currentQuestion.correctAnswer = parseFloat(value);
            } else {
                currentQuestion.correctAnswer = value;
            }
        } else if (key === 'correctSentence') {
            currentQuestion.correctSentence = value.split(',').map(item => item.trim());
        } else if (key === 'min' || key === 'max') {
            currentQuestion[key] = parseInt(value);
        } else if (key === 'pairs') {
            const pairsArr = value.split(';').map(pair => pair.trim().split('=').map(item => item.trim()));
            currentQuestion.pairs = Object.fromEntries(pairsArr);
        }
    });

    if (Object.keys(currentQuestion).length > 0) {
        parsedQuestions.push(currentQuestion);
    }
    
    return parsedQuestions;
}

function startQuiz() {
    countdownScreen.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    randomizedQuestions = shuffleArray(questions);
    checkButton.addEventListener('click', checkAnswer);
    startTime = Date.now();
    loadQuestion();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateProgressBar() {
    const progress = (currentQuestionIndex / randomizedQuestions.length) * 100;
    progressBar.style.width = progress + '%';
}

function loadQuestion() {
    if (currentQuestionIndex >= randomizedQuestions.length) {
        showFinalScreen();
        return;
    }

    const currentQuestion = randomizedQuestions[currentQuestionIndex];
    questionTextElement.textContent = currentQuestion.question;
    optionsContainer.innerHTML = '';
    selectedOption = null;
    currentSentence = [];
    matchedPairs = [];
    selectedMatch = null;
    fillBlankSelected = null;
    checkButton.disabled = true;
    checkButton.textContent = "Verificar";
    feedbackText.textContent = "";

    switch (currentQuestion.type) {
        case 'multiple-choice':
            renderMultipleChoice(currentQuestion);
            break;
        case 'word-bank':
            renderWordBank(currentQuestion);
            break;
        case 'true-false':
            renderTrueFalse(currentQuestion);
            break;
        case 'slider':
            renderSliderQuestion(currentQuestion);
            break;
        case 'match':
            renderMatchQuestion(currentQuestion);
            break;
        case 'fill-blank':
            renderFillBlankQuestion(currentQuestion);
            break;
    }
    
    updateProgressBar();
}

function renderMultipleChoice(question) {
    const optionsGrid = document.createElement('div');
    optionsGrid.classList.add('options-container');
    const shuffledOptions = shuffleArray([...question.options]);
    
    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('option-button');
        button.addEventListener('click', () => selectOption(button));
        optionsGrid.appendChild(button);
    });
    optionsContainer.appendChild(optionsGrid);
}

function renderWordBank(question) {
    const sentenceContainer = document.createElement('div');
    sentenceContainer.classList.add('sentence-container');
    sentenceContainer.addEventListener('click', (event) => removeWord(event));
    optionsContainer.appendChild(sentenceContainer);

    const wordBankContainer = document.createElement('div');
    wordBankContainer.classList.add('word-bank-container');

    const shuffledWords = shuffleArray([...question.wordBank]);
    
    shuffledWords.forEach(word => {
        const button = document.createElement('button');
        button.textContent = word;
        button.classList.add('option-button');
        button.addEventListener('click', () => addWord(button, sentenceContainer));
        wordBankContainer.appendChild(button);
    });
    optionsContainer.appendChild(wordBankContainer);
}

function renderTrueFalse(question) {
    const optionsGrid = document.createElement('div');
    optionsGrid.classList.add('options-container');

    const trueButton = document.createElement('button');
    trueButton.textContent = "Verdadero";
    trueButton.classList.add('option-button');
    trueButton.dataset.value = 'true';
    trueButton.addEventListener('click', () => selectOption(trueButton));

    const falseButton = document.createElement('button');
    falseButton.textContent = "Falso";
    falseButton.classList.add('option-button');
    falseButton.dataset.value = 'false';
    falseButton.addEventListener('click', () => selectOption(falseButton));
    
    optionsGrid.appendChild(trueButton);
    optionsGrid.appendChild(falseButton);
    optionsContainer.appendChild(optionsGrid);
}

function renderSliderQuestion(question) {
    const sliderContainer = document.createElement('div');
    sliderContainer.classList.add('slider-container');

    const sliderValue = document.createElement('div');
    sliderValue.id = 'slider-value';
    sliderValue.textContent = question.min;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'number-slider';
    slider.min = question.min;
    slider.max = question.max;
    slider.value = question.min;

    slider.addEventListener('input', () => {
        sliderValue.textContent = slider.value;
    });
    
    slider.addEventListener('change', () => {
        checkButton.disabled = false;
    });

    sliderContainer.appendChild(sliderValue);
    sliderContainer.appendChild(slider);
    optionsContainer.appendChild(sliderContainer);
}

function renderMatchQuestion(question) {
    const matchGrid = document.createElement('div');
    matchGrid.classList.add('match-grid');

    const allOptions = [];
    for (const key in question.pairs) {
        allOptions.push({ type: 'en', value: key });
        allOptions.push({ type: 'es', value: question.pairs[key] });
    }
    
    shuffleArray(allOptions);

    allOptions.forEach(item => {
        const button = document.createElement('button');
        button.textContent = item.value;
        button.classList.add('option-button', 'match-option');
        button.dataset.pair = item.type === 'en' ? question.pairs[item.value] : Object.keys(question.pairs).find(key => question.pairs[key] === item.value);
        button.addEventListener('click', () => selectMatch(button));
        matchGrid.appendChild(button);
    });

    optionsContainer.appendChild(matchGrid);
}

function renderFillBlankQuestion(question) {
    const fillBlankContainer = document.createElement('div');
    fillBlankContainer.classList.add('fill-blank-container');
    const sentenceParts = question.question.split('___');
    
    const beforeBlank = document.createElement('span');
    beforeBlank.textContent = sentenceParts[0];
    fillBlankContainer.appendChild(beforeBlank);

    const blankSpace = document.createElement('span');
    blankSpace.id = 'blank-space';
    fillBlankContainer.appendChild(blankSpace);

    const afterBlank = document.createElement('span');
    afterBlank.textContent = sentenceParts[1];
    fillBlankContainer.appendChild(afterBlank);

    const wordBankContainer = document.createElement('div');
    wordBankContainer.classList.add('word-bank-container');

    const shuffledOptions = shuffleArray([...question.options]);
    shuffledOptions.forEach(word => {
        const button = document.createElement('button');
        button.textContent = word;
        button.classList.add('option-button');
        button.addEventListener('click', () => selectFillBlank(button));
        wordBankContainer.appendChild(button);
    });

    optionsContainer.appendChild(fillBlankContainer);
    optionsContainer.appendChild(wordBankContainer);
}

function selectOption(button) {
    if (selectedOption) {
        selectedOption.classList.remove('selected');
    }
    button.classList.add('selected');
    selectedOption = button;
    checkButton.disabled = false;
}

function addWord(button, sentenceContainer) {
    const word = button.textContent;
    currentSentence.push(word);
    
    const wordElement = document.createElement('div');
    wordElement.textContent = word;
    wordElement.classList.add('sentence-word');
    wordElement.dataset.word = word;
    sentenceContainer.appendChild(wordElement);

    button.style.display = 'none';
    checkButton.disabled = false;
}

function removeWord(event) {
    const target = event.target;
    if (target.classList.contains('sentence-word')) {
        const word = target.dataset.word;
        const index = currentSentence.indexOf(word);
        if (index > -1) {
            currentSentence.splice(index, 1);
        }
        
        target.remove();
        
        const buttonsInBank = document.querySelectorAll('.word-bank-container .option-button');
        buttonsInBank.forEach(button => {
            if (button.textContent === word) {
                button.style.display = 'block';
            }
        });
        
        checkButton.disabled = currentSentence.length === 0;
    }
}

function selectMatch(button) {
    if (selectedMatch) {
        if (selectedMatch.dataset.pair === button.textContent) {
            button.classList.add('correct');
            selectedMatch.classList.add('correct');
            matchedPairs.push(selectedMatch.textContent);
            matchedPairs.push(button.textContent);
            selectedMatch = null;
            matchCorrectSound.play();
        } else {
            selectedMatch.classList.add('incorrect');
            button.classList.add('incorrect');
            setTimeout(() => {
                selectedMatch.classList.remove('incorrect');
                button.classList.remove('incorrect');
                selectedMatch.classList.remove('selected');
                selectedMatch = null;
            }, 500);
        }
    } else {
        button.classList.add('selected');
        selectedMatch = button;
    }
    
    const currentQuestion = randomizedQuestions[currentQuestionIndex];
    checkButton.disabled = matchedPairs.length !== Object.keys(currentQuestion.pairs).length * 2;
}

function selectFillBlank(button) {
    const blankSpace = document.getElementById('blank-space');
    
    if (fillBlankSelected) {
        const previousButton = document.querySelector(`.word-bank-container button[data-word="${fillBlankSelected}"]`);
        if (previousButton) {
            previousButton.style.display = 'block';
        }
    }

    blankSpace.textContent = button.textContent;
    fillBlankSelected = button.textContent;
    button.style.display = 'none';
    
    button.dataset.word = button.textContent;
    
    checkButton.disabled = false;
}

function checkAnswer() {
    const currentQuestion = randomizedQuestions[currentQuestionIndex];
    let isCorrect = false;

    switch (currentQuestion.type) {
        case 'multiple-choice':
            if (selectedOption && selectedOption.textContent === currentQuestion.correctAnswer) {
                isCorrect = true;
            }
            break;
        case 'word-bank':
            if (JSON.stringify(currentSentence) === JSON.stringify(currentQuestion.correctSentence)) {
                isCorrect = true;
            }
            break;
        case 'true-false':
            if (selectedOption && selectedOption.dataset.value === String(currentQuestion.correctAnswer)) {
                isCorrect = true;
            }
            break;
        case 'slider':
            const sliderValue = document.getElementById('number-slider').value;
            if (parseInt(sliderValue) === currentQuestion.correctAnswer) {
                isCorrect = true;
            }
            break;
        case 'match':
            isCorrect = matchedPairs.length === Object.keys(currentQuestion.pairs).length * 2;
            break;
        case 'fill-blank':
            isCorrect = fillBlankSelected === currentQuestion.correctAnswer;
            break;
    }

    if (isCorrect) {
        score++;
        handleCorrectAnswer();
    } else {
        handleIncorrectAnswer();
    }
}

function handleCorrectAnswer() {
    correctSound.play();
    feedbackText.textContent = "¡Correcto!";
    feedbackText.style.color = "#58cc02";
    
    const currentQuestion = randomizedQuestions[currentQuestionIndex];
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
        if (selectedOption) {
            selectedOption.classList.remove('selected');
            selectedOption.classList.add('correct');
        }
    } else if (currentQuestion.type === 'fill-blank') {
        const blankSpace = document.getElementById('blank-space');
        blankSpace.style.color = "#58cc02";
    }

    Array.from(optionsContainer.querySelectorAll('button, .sentence-word, input, div')).forEach(el => {
        el.disabled = true;
        el.style.pointerEvents = 'none';
    });
    
    checkButton.textContent = "Continuar";
    checkButton.removeEventListener('click', checkAnswer);
    checkButton.addEventListener('click', nextQuestion);
}

function handleIncorrectAnswer() {
    incorrectSound.play();
    feedbackText.textContent = `Incorrecto. La respuesta correcta es "${getCorrectAnswerText()}"`;
    feedbackText.style.color = "#ff4b4b";
    
    const currentQuestion = randomizedQuestions[currentQuestionIndex];
    if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') {
        if (selectedOption) {
            selectedOption.classList.add('incorrect');
        }
    } else if (currentQuestion.type === 'fill-blank') {
        const blankSpace = document.getElementById('blank-space');
        blankSpace.style.color = "#ff4b4b";
    }

    Array.from(optionsContainer.querySelectorAll('button, .sentence-word, input, div')).forEach(el => {
        el.disabled = true;
        el.style.pointerEvents = 'none';
    });
    
    checkButton.textContent = "Continuar";
    checkButton.removeEventListener('click', checkAnswer);
    checkButton.addEventListener('click', nextQuestion);
}

function getCorrectAnswerText() {
    const currentQuestion = randomizedQuestions[currentQuestionIndex];
    switch (currentQuestion.type) {
        case 'multiple-choice':
        case 'true-false':
        case 'slider':
        case 'fill-blank':
            return currentQuestion.correctAnswer;
        case 'word-bank':
            return currentQuestion.correctSentence.join(' ');
        case 'match':
            return "No aplica";
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
    checkButton.removeEventListener('click', nextQuestion);
    checkButton.addEventListener('click', checkAnswer);
}

function showFinalScreen() {
    finalSound.play();
    finalTitle.textContent = "Quiz completado";

    quizContainer.classList.add('hidden');
    finalScreen.classList.remove('hidden');
    updateProgressBar();
}