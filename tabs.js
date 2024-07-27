

const nFrets = 24;
const notes = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];


const activeNotes = [];

const container = document.querySelector('#container');

const nutPositions = calculateNuts(nFrets+1);

const arm = createArm(nutPositions);


const fretsByNote = new Map();
const fretsByTonic = new Map();

// Note commands: toggle, activate, deactivate
const COMMAND_TOGGLE = 'toggle';
const COMMAND_ACTIVATE = 'activate';
const COMMAND_DEACTIVATE = 'deactivate';

class NoteEvent extends Event {
    static TYPE = 'note';
    constructor(note, command) {
        super(NoteEvent.TYPE);
        this.note = note;
        this.command = command;
    }
}

window.addEventListener(NoteEvent.TYPE, noteEventListener);

window.addEventListener('popstate', (evt) => {
    if (evt.state !== null) {
        const notes = evt.state;
        activeNotes.filter(note => !notes.includes(note)).forEach(note => {
            window.dispatchEvent(new NoteEvent(note, COMMAND_DEACTIVATE));
        });
    }
});

window.addEventListener('hashchange', (evt) => {
    if (history.state === null) {
        loadHash();
    } else {
        history.state.filter(note => !activeNotes.includes(note)).forEach(note => {
            window.dispatchEvent(new NoteEvent(note, COMMAND_ACTIVATE));
        });
        activeNotes.filter(note => !history.state.includes(note)).forEach(note => {
            window.dispatchEvent(new NoteEvent(note, COMMAND_DEACTIVATE));
        });
    }
});

arm.strings.forEach((string) => {
    string.frets.forEach((fret) => {

        const byNote = fretsByNote.get(fret.note) ?? [];
        byNote.push(fret.node);
        fretsByNote.set(fret.note, byNote);


        const byTonic = fretsByTonic.get(fret.tonic) ?? [];
        byTonic.push(fret.node);
        fretsByTonic.set(fret.tonic, byTonic);

        fret.node.addEventListener('click', (evt) => {
            evt.preventDefault();
            if (evt.target.dataset.note !== undefined) {
                window.dispatchEvent(new NoteEvent(evt.target.dataset.note, COMMAND_TOGGLE));
            }
        });

        // fret.fretString.node.addEventListener('click', (evt) => { return false; });
    });
});

loadHash();

function noteToHue(note) {

    const mostTreble = noteFromString(notes[0].substring(0, notes[0].length - 1), parseInt(notes[0][notes[0].length - 1]), nFrets);
    const mostBass = noteFromString(notes[notes.length - 1].substring(0, notes[notes.length - 1].length - 1), parseInt(notes[notes.length - 1][notes[notes.length - 1].length - 1]), 0);

    // distribute hue between 0 and 360 based on the position of the note between the most treble and most bass notes
    const treblePos = noteOrder.indexOf(mostTreble.tonic) + mostTreble.octave * 12;
    const bassPos = noteOrder.indexOf(mostBass.tonic) + mostBass.octave * 12;

    const octave = parseInt(note[note.length - 1]);
    const notePos = noteOrder.indexOf(note.substring(0, note.length - 1));
    return ((notePos + octave * 12) - bassPos) * 360 / (treblePos - bassPos + 10); // +10 to avoid similar hues for the extreme notes
}

function noteColor(note) {
    const hue = noteToHue(note);
    return `hsl(${hue}, 80%, 66%)`;
}

function toggleNote(note) {
    const frets = isTonic(note) ? fretsByTonic.get(note) : fretsByNote.get(note);
    if (frets !== undefined) {
        frets.forEach(e => {e.classList.toggle('active');});
    }
}

function createArm() {
    const arm = document.createElement('div');
    arm.className = 'arm';
    // set the number of frets in the grid
    arm.style.gridTemplateColumns = `repeat(${nFrets+1}, 1fr)`;
    container.appendChild(arm);

    const strings = [];
    
    for (let i = 0; i < notes.length; i++) {
        const stringTonic = notes[i].substring(0, notes[i].length - 1);
        const stringOctave = parseInt(notes[i].substring(notes[i].length - 1));

        strings.push({ frets: createFrets(i, stringTonic, stringOctave, arm, nutPositions) });
    }

    for (let i = 0; i <= nFrets; i++) {
        const fretN = arm.appendChild(document.createElement('div'));
        fretN.classList.add('fret-number');
        fretN.innerText = i;
    }

    return { node: arm, strings: strings};
   
}

function createFrets(i, stringTonic, stringOctave, arm, nutPositions) {
    const frets = [];
    for (let j = 0; j <= nFrets; j++) {

        const fret = document.createElement('button');
        
        fret.classList.add('fret');
        fret.classList.add('note');
        fret.dataset.string = i;
        fret.dataset.fret = j;
        fret.dataset.stringTonic = stringTonic;
        fret.dataset.stringOctave = stringOctave;

        

        
        // ~~ is a bitwise NOT operator, it's a faster way to floor a POSITIVE number
        const note = noteFromString(stringTonic, stringOctave, j);
        fret.dataset.note = note.note;
        fret.dataset.tonic = note.tonic;
        fret.dataset.octave = note.octave;
        fret.dataset.number = j;
        fret.style.setProperty('--string-number', i);
        fret.style.setProperty('--fret-number', j);
        fret.style.setProperty('--fret-width', nutPositions[j+1] - nutPositions[j]);
        fret.style.setProperty('--active-color', noteColor(fret.dataset.note));
        fret.id = `f${stringTonic}${stringOctave}-${fret.dataset.note}`;
        fret.textContent = fret.dataset.note;

    
        arm.appendChild(fret);
        frets.push({ node: fret, tonic: fret.dataset.tonic, octave: fret.dataset.octave, note: fret.dataset.note });
    }

    return frets;
}

function calculateNuts(nFrets) {
    const nutToFret = [0];
    for (let i = 1; i <= nFrets; i++) {
        nutToFret.push(nutToFret[i - 1] + (100 - nutToFret[i - 1]) / 17.817);
    }
    const mult = 100 / nutToFret[nutToFret.length - 1];
    nutToFret.forEach((e, i) => {
        nutToFret[i] *= mult;
    });
    return nutToFret;
}

function loadHash() {
    const hash = window.location.hash;
    activeNotes.forEach(toggleNote);
    activeNotes.splice(0, activeNotes.length);
    if (hash) {
        const notes = hash.substring(1).split(',');
        console.log(`Loading notes: `, notes);
        notes.forEach(toggleNote);
        activeNotes.push(...notes);
        activeNotes.sort(noteComparator);
    }
}

function clearNotes() {
    console.log('clear');
    activeNotes.forEach(toggleNote);
    activeNotes.splice(0, activeNotes.length);
    window.location.hash = '';
}

function noteEventListener(evt) {
    const note = evt.note;
    switch (evt.command) {
        case COMMAND_TOGGLE:
            if (activeNotes.includes(note)) {
                activeNotes.splice(activeNotes.indexOf(note), 1);
            } else {
                activeNotes.push(note);
            }
            toggleNote(note);
            break;
        case COMMAND_ACTIVATE:
            if (!activeNotes.includes(note)) {
                activeNotes.push(note);
                toggleNote(note);
            }
            break;
        case COMMAND_DEACTIVATE:
            if (activeNotes.includes(note)) {
                activeNotes.splice(activeNotes.indexOf(note), 1);
                toggleNote(note);
            }
            break;
    }

    activeNotes.sort(noteComparator);

    const state = activeNotes;
    if (history.state == null || history.state.join(",") !== state.join(",")) {
        history.pushState(state, '', '#' + activeNotes.join(','));
    }
}

function noteComparator(a, b) {
    const aPos = isTonic(a) ? noteOrder.indexOf(a) : noteOrder.indexOf(a.substring(0, a.length - 1)) + parseInt(a[a.length - 1]) * 12;
    const bPos = isTonic(b) ? noteOrder.indexOf(b) : noteOrder.indexOf(b.substring(0, b.length - 1)) + parseInt(b[b.length - 1]) * 12;
    return aPos - bPos;
}

function isTonic(note) {
    return !(note[note.length - 1] >= '0' && note[note.length - 1] <= '9');
}

function noteToIndex(note) {
    return noteOrder.indexOf(note.substring(0, note.length - 1)) + parseInt(note[note.length - 1]) * 12;
}

function noteFromString(stringTonic, stringOctave, fretIndex) {
    const notePos = (noteOrder.indexOf(stringTonic) + fretIndex);
    const octave = ~~(stringOctave + notePos / 12)
    const tonic = noteOrder[notePos % 12];
    return { note: tonic + octave, tonic: tonic, octave: octave };
}