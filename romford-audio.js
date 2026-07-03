var audio, audioInterval;
var generateAudioFrame; /* function to generate one frame of audio, or null if nothing to play at the moment */

var playingRow = Property(null);
var playingPosition = Property(null);

$(function() {
	audio = new DynamicAudio();
	audio.init();
})

function audioIsPlaying() {
	return !!generateAudioFrame;
}

function stopAudio() {
	generateAudioFrame = null;
	playingRow.set(null);
	playingPosition.set(null);
	//audio.stop();
}

NOTE_VALUES_BY_NOTE_NAME = {
	'C-': 0,
	'C#': 1,
	'D-': 2,
	'D#': 3,
	'E-': 4,
	'F-': 5,
	'F#': 6,
	'G-': 7,
	'G#': 8,
	'A-': 9,
	'A#': 10,
	'B-': 11
}

function audioLoop() {
	if (generateAudioFrame) {
		for (var i = 0; i < 5; i++) generateAudioFrame();
		setTimeout(audioLoop, 100);
	}
}

audioData = Array(882*2);// new Uint8Array(882);

function generateAudioForNote(period, volume) {
	if (period) {
		var playTime = 441 * volume / 99;
		/* playTime should be a whole number of periods */
		playTime = period * Math.floor(playTime / period);
		for (var i = 0; i < 882; i++) {
			if (i <= playTime) {
				audioData[i*2] = audioData[i*2+1] = 1 - ((i / period) & 1);
			} else {
				audioData[i*2] = audioData[i*2+1] = 0;
			}
		}
	} else {
		/* no note - silence */
		for (var i = 0; i < 882; i++) {
			audioData[i*2] = audioData[i*2+1] = 0;
		}
	}
	
	audio.write(audioData);
}

function getNotesForRow(position, rowNumber) {
	return _.map(position.getPatterns(), function(pattern) {
		return pattern.notes[rowNumber];
	});
}
function getPeriodsForNotes(notes) {
	return _.map(notes, function(note) {
		if (note.noteName) {
			var noteValue = (note.octave * 12) + NOTE_VALUES_BY_NOTE_NAME[note.noteName];
			return (44100/440/2) / Math.pow(2, (noteValue - 57) / 12);
		} else {
			return null;
		}
	})
}

function playRow(position, rowNumber, masterVolume) {
	var channel = 0;
	
	var notes = getNotesForRow(position, rowNumber);
	var notePeriods = getPeriodsForNotes(notes);
	
	playingPosition.set(position);
	playingRow.set(rowNumber);
	
	var volumeScale = masterVolume / 99;
	
	generateAudioFrame = function() {
		generateAudioForNote(notePeriods[channel], notes[channel].volume * volumeScale);
		channel = (channel + 1) % notes.length;
	}
	
	audioLoop();
}

function playPosition(position, masterVolume) {
	var channel = 0;
	var rowNumber = 0;
	var rowTick = 0;
	var notes = getNotesForRow(position, rowNumber);
	var notePeriods = getPeriodsForNotes(notes);
	
	playingPosition.set(position);
	playingRow.set(rowNumber);
	
	var volumeScale = masterVolume / 99;
	
	generateAudioFrame = function() {
		generateAudioForNote(notePeriods[channel], notes[channel].volume * volumeScale);
		channel = (channel + 1) % notes.length;
		rowTick = (rowTick + 1) % position.tempo.get();
		if (rowTick === 0) {
			rowNumber = (rowNumber + 1) % position.length.get();
			playingRow.set(rowNumber);
			notes = getNotesForRow(position, rowNumber);
			notePeriods = getPeriodsForNotes(notes);
		}
	}
	audioLoop();
}

function playSong(song, positionNumber) {
	var position = song.getPosition(positionNumber);
	var channel = 0;
	var rowNumber = 0;
	var rowTick = 0;
	var notes = getNotesForRow(position, rowNumber);
	var notePeriods = getPeriodsForNotes(notes);
	
	playingPosition.set(position);
	playingRow.set(rowNumber);
	
	var masterVolume = song.masterVolume.get() / 99;
	
	generateAudioFrame = function() {
		generateAudioForNote(notePeriods[channel], notes[channel].volume * masterVolume);
		channel = (channel + 1) % notes.length;
		rowTick = (rowTick + 1) % position.tempo.get();
		if (rowTick === 0) {
			rowNumber = (rowNumber + 1) % position.length.get();
			if (rowNumber === 0) {
				positionNumber = (positionNumber + 1) % song.length.get();
				position = song.getPosition(positionNumber);
				playingPosition.set(position);
			}
			playingRow.set(rowNumber);
			notes = getNotesForRow(position, rowNumber);
			notePeriods = getPeriodsForNotes(notes);
		}
	}
	audioLoop();
}
