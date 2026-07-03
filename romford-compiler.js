function compileSong(song) {
	
	/* generate position data block, while constructing a list of used patterns */
	var patternSequence = [];
	var patternPositionByOriginalId = {};
	var positionData = [];
	
	for (var i = 0; i < song.length.get(); i++) {
		var position = song.getPosition(i);
		var patternIds = position.patternIds.get();
		
		positionData.push(position.tempo.get());
		positionData.push(position.length.get());
		positionData.push(patternIds.length);
		
		for (var j = 0; j < patternIds.length; j++) {
			var patternId = patternIds[j];
			if (patternPositionByOriginalId[patternId] == null) {
				/* pattern not currently in sequence; add it */
				patternPositionByOriginalId[patternId] = patternSequence.length;
				patternSequence.push(song.getPattern(patternId));
			}
			positionData.push(patternPositionByOriginalId[patternId]);
		}
	}
	
	var patternData = [];
	var noteIndexByNoteName = [];
	var noteTable = [];
	/* generate pattern data block, while constructing a list of used notes */
	for (var i = 0; i < patternSequence.length; i++) {
		var pattern = patternSequence[i];
		for (var j = 0; j < 64; j++) {
			var note = pattern.notes[j];
			var noteName = noteToString(note);
			if (noteIndexByNoteName[noteName] == null) {
				noteIndexByNoteName[noteName] = noteTable.length;
				noteTable.push(note);
			}
			patternData.push(noteIndexByNoteName[noteName]);
		}
	}
	
	var masterVolume = song.masterVolume.get() / 99;
	var noteData = [];
	/* convert note table to Spectrum timings */
	for (var i = 0; i < noteTable.length; i++) {
		var note = noteTable[i];
		if (note.noteName) {
			var noteValue = (note.octave * 12) + NOTE_VALUES_BY_NOTE_NAME[note.noteName];
			var freq = 440 * Math.pow(2, (noteValue-57)/12);
			var period = Math.round(3500000.0 / (8*freq) - 30.125);
			var repeat = Math.floor(freq * 0.01 * note.volume/99 * masterVolume);
			// to make (bass) notes always play for at least one period, even if it exceeds the desired frame time:
			// if (repeat === 0) repeat = 1;
		} else {
			var period = 0;
			var repeat = 0;
		}
		
		noteData.push(period & 0xff);
		noteData.push(period >> 8);
		noteData.push(repeat);
	}
	
	var songData = [];
	songData.push(song.length.get());
	var patternDataOffset = 5 + positionData.length;
	songData.push(patternDataOffset & 0xff);
	songData.push(patternDataOffset >> 8);
	var noteDataOffset = patternDataOffset + patternData.length;
	songData.push(noteDataOffset & 0xff);
	songData.push(noteDataOffset >> 8);
	
	return arrayAsHex(songData) + arrayAsHex(positionData) + arrayAsHex(patternData) + arrayAsHex(noteData);
}

function arrayAsHex(arr) {
	return _.map(arr, function(i) {
		return "%" + ("0123456789ABCDEF"[i >> 4]) + ("0123456789ABCDEF"[i & 0x0f])
	}).join('');
}
