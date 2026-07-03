function isNumeric(val) {
	return !isNaN(parseFloat(val));
}

function Event() {
	var self = {};
	var listeners = [];
	
	self.bind = function(callback) {
		listeners.push(callback);
	}
	self.unbind = function(callback) {
		listeners = _.without(listeners, callback);
	}
	self.trigger = function() {
		var args = arguments;
		_.each(listeners, function(callback) {
			callback.apply(null, args);
		});
	}
	
	return self;
}

function Property(initialValue) {
	var self = {};
	
	self._value = initialValue;
	
	self.change = Event();
	self.get = function() {
		return self._value;
	}
	self.set = function(newValue) {
		if (newValue === self._value) return;
		self._value = newValue;
		self.change.trigger(self._value);
	}
	self.toJSON = function() {
		return self._value;
	}
	
	return self;
}
function NumericProperty(initialValue) {
	var self = Property(initialValue);
	
	self.normaliseValue = function(value) {
		if (!isNumeric(value)) return null;
		return parseFloat(value);
	}
	
	self.set = function(newValue) {
		newValue = self.normaliseValue(newValue);
		if (newValue === null || newValue === self._value) return;
		self._value = newValue;
		self.change.trigger(self._value);
	}
	
	return self;
}

function NumericArrayProperty(initialValue) {
	var self = Property(initialValue);
	
	self.normaliseValue = function(value) {
		if (typeof(value) === 'string') value = value.split(',');
		var elements = [];
		_.each(value, function(i) {
			if (isNumeric(i)) elements.push(parseFloat(i));
		})
		return elements;
	}
	
	self.set = function(newValue) {
		newValue = self.normaliseValue(newValue);
		if (_.isEqual(self._value, newValue)) return;
		self._value = newValue;
		self.change.trigger(self._value);
	}
	
	return self;
}

function Position(opts) {
	var self = {};
	
	self.tempo = NumericProperty(opts.tempo);
	self.length = NumericProperty(opts.length);
	self.patternIds = NumericArrayProperty(opts.patternIds);
	self.song = opts.song;
	self.number = opts.number;
	
	self.getPatterns = function() {
		return _.map(self.patternIds.get(), function(i) {
			return self.song.getPattern(i);
		})
	}
	
	self.toJSON = function() {
		return {
			'tempo': self.tempo,
			'length': self.length,
			'patternIds': self.patternIds
		}
	}
	
	return self;
}

function noteToString(note) {
	if (note.noteName) {
		return note.noteName + note.octave + ' ' + ('0'+note.volume).substr(-2,2);
	} else {
		return '--- --';
	}
}

function Pattern(data) {
	var self = {};
	
	if (!data) data = [];
	
	self.noteUpdated = Event();
	self.notes = [];
	for (var i = 0; i < 64; i++) {
		if (data[i] && data[i] != '--- --') {
			self.notes[i] = {
				'noteName': data[i].substr(0,2),
				'octave': parseInt(data[i].substr(2,1), 10),
				'volume': parseInt(data[i].substr(4,2), 10)
			};
		} else {
			self.notes[i] = {
				'noteName': null,
				'octave': null,
				'volume': 99
			};
		}
	}
	self.setNote = function(rowNumber, newNoteProperties) {
		var note = self.notes[rowNumber];
		for (prop in newNoteProperties) {
			note[prop] = newNoteProperties[prop];
		}
		self.noteUpdated.trigger(rowNumber, note);
	}
	
	self.isEmpty = function() {
		return _.all(self.notes, function(note) {return note.noteName === null});
	}
	
	self.toJSON = function() {
		if (self.isEmpty()) {
			return null;
		} else {
			return _.map(self.notes, noteToString);
		}
	}
	
	return self;
}

function Song(data) {
	var self = {};
	
	if (!data) data = {};
	
	self.length = NumericProperty(data.length || 1);
	self.masterVolume = NumericProperty(data.masterVolume || 99);
	
	var positions = [];
	_.each(data.positions || [], function(positionData, index) {
		if (positionData) {
			positionData.song = self;
			positionData.number = index;
			positions[index] = Position(positionData);
		}
	});
	var patterns = _.map(data.patterns || [], Pattern);;
	
	self.getPosition = function(i) {
		if (!positions[i]) {
			positions[i] = Position({
				'tempo': 6,
				'length': 64,
				'patternIds': [0,1,2,3],
				'song': self,
				'number': i
			})
		}
		return positions[i];
	}
	
	self.getPattern = function(i) {
		if (!patterns[i]) {
			patterns[i] = Pattern();
		}
		return patterns[i];
	}
	
	self.toJSON = function() {
		/* serialize patterns up to the last nonempty one */
		var maxPatternIndex = -1;
		for (var i = 0; i < patterns.length; i++) {
			if (patterns[i] && !patterns[i].isEmpty()) maxPatternIndex = i;
		}
		var patternsToSave = patterns.slice(0, maxPatternIndex+1);
		return {
			'length': self.length,
			'masterVolume': self.masterVolume,
			'positions': positions,
			'patterns': patternsToSave
		}
	}
	
	return self;
}
var song = Song();
