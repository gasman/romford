NOTES_BY_KEYCODE = {
	90: 'C-',
	83: 'C#',
	88: 'D-',
	68: 'D#',
	67: 'E-',
	86: 'F-',
	71: 'F#',
	66: 'G-',
	72: 'G#',
	78: 'A-',
	74: 'A#',
	77: 'B-'
}


function PropertyInputBinding(property, input) {
	var self = {};
	
	$(input).val(property.get());
	var onPropertyChange = function(newValue) {
		var currentValue = property.normaliseValue( $(input).val() );
		if (_.isEqual(newValue, currentValue)) return;
		$(input).val(newValue);
	}
	var onInputChange = function() {
		property.set($(this).val());
	}
	
	property.change.bind(onPropertyChange);
	$(input).bind('change', onInputChange);
	$(input).bind('input', onInputChange);
	
	self.remove = function() {
		property.change.unbind(onPropertyChange);
		$(input).unbind('change', onInputChange);
		$(input).unbind('input', onInputChange);
	}
	
	return self;
}

$.fn.bindProperty = function(property) {
	return PropertyInputBinding(property, this);
}

function PositionView() {
	var self = {};
	
	var positionLengthBinding, positionTempoBinding, positionPatternsBinding;
	
	self.bind = function(position) {
		if (positionLengthBinding) positionLengthBinding.remove();
		if (positionTempoBinding) positionTempoBinding.remove();
		if (positionPatternsBinding) positionPatternsBinding.remove();
		
		positionLengthBinding = $('#position-length-input').bindProperty(position.length);
		positionTempoBinding = $('#position-tempo-input').bindProperty(position.tempo);
		positionPatternsBinding = $('#position-patterns-input').bindProperty(position.patternIds);
	}
	
	return self;
}

function PatternsView() {
	var self = {};
	
	var position;
	
	var cursorX = 0;
	var cursorY = 0;
	
	var renderTableCell = function(rowNumber, pattern, columnNumber) {
		var cell = $('<td></td>');
		cell.attr('tabindex', 0);
		var note = pattern.notes[rowNumber];
		cell.text(noteToString(note));
		
		cell.focus(function() {
			cursorX = columnNumber;
			cursorY = rowNumber;
		})
		
		var lastKeyCode;
		cell.keydown(function(e) {
			if (e.keyCode == lastKeyCode) return;
			lastKeyCode = e.keyCode;
			var cancelDefault = false;
			
			/* TODO: check whether we should be using keyCode or which */
			if (NOTES_BY_KEYCODE[e.keyCode]) {
				pattern.setNote(rowNumber, {
					'noteName': NOTES_BY_KEYCODE[e.keyCode],
					'octave': editorOctave.get(),
					'volume': editorVolume.get()
				});
				playRow(position, rowNumber, song.masterVolume.get());
			} else if (e.keyCode >= 48 && e.keyCode <= 57 && !e.ctrlKey) {
				var newVolume = (note.volume % 10) * 10 + e.keyCode - 48;
				pattern.setNote(rowNumber, {
					'volume': newVolume
				});
			} else if (e.keyCode === 32) {
				pattern.setNote(rowNumber, {
					'noteName': null
				});
				playRow(position, rowNumber, song.masterVolume.get());
				cancelDefault = true;
			} else if (e.keyCode === 190) {
				playRow(position, rowNumber, song.masterVolume.get());
			}
			
			if (cancelDefault) return false;
		}).keyup(function(e) {
			lastKeyCode = null;
			stopAudio();
		});
		return cell;
	}
	
	var renderTableRow = function(rowNumber, patterns) {
		var row = $('<tr></tr>');
		row.append($('<th></th>').text(rowNumber));
		for (var j = 0; j < patterns.length; j++) {
			row.append(renderTableCell(rowNumber, patterns[j], j));
		}
		return row;
	}
	
	var getCellAtCoordinates = function(col, row) {
		return $('#patterns tr').eq(row).find('td').eq(col);
	}
	
	var lastPlayingRow = null;
	var highlightPlayingRow = function(rowNumber) {
		if (lastPlayingRow !== null) {
			$('#patterns tr').eq(lastPlayingRow).removeClass('playing');
		}
		if (rowNumber !== null && playingPosition.get() === song.getPosition(editorPosition.get())) {
			$('#patterns tr').eq(rowNumber).addClass('playing');
			lastPlayingRow = rowNumber;
		} else {
			lastPlayingRow = null;
		}
	}
	playingRow.change.bind(highlightPlayingRow);
	
	var renderTable = function() {
		/* unbind any existing column listeners */
		for (var i = 0; i < columnListeners.length; i++) {
			columnListeners[i].pattern.noteUpdated.unbind(columnListeners[i].listener);
		}
		columnListeners = [];
		
		$('#patterns').empty();
		patterns = position.getPatterns();
		for (var i = 0; i < position.length.get(); i++) {
			$('#patterns').append(renderTableRow(i, patterns));
		}
		
		_.each(position.getPatterns(), function(pattern, columnIndex) {
			var listener = function(rowNumber, note) {
				var cell = getCellAtCoordinates(columnIndex, rowNumber);
				cell.text(noteToString(note));
			}
			pattern.noteUpdated.bind(listener);
			
			columnListeners.push({pattern: pattern, listener: listener});
		})
	}
	
	var columnListeners = []; /* array of objects consisting of pattern and listener function */
	
	self.bind = function(newPosition) {
		/* unbind existing listeners, if any */
		if (position) {
			position.length.change.unbind(renderTable);
			position.patternIds.change.unbind(renderTable);
		}
		
		position = newPosition;
		position.length.change.bind(renderTable);
		position.patternIds.change.bind(renderTable);
		renderTable();
	}
	
	$('#patterns').keydown(function(e) {
		switch (e.keyCode) {
			case 37: /* left */
				if (cursorX > 0) {
					getCellAtCoordinates(cursorX-1, cursorY).focus();
				}
				return false;
			case 39: /* right */
				if (cursorX < position.patternIds.get().length - 1) {
					getCellAtCoordinates(cursorX+1, cursorY).focus();
				}
				return false;
			case 38: /* up */
				if (cursorY > 0) {
					getCellAtCoordinates(cursorX, cursorY-1).focus();
				}
				return false;
			case 40: /* down */
				if (cursorY < position.length.get() - 1) {
					getCellAtCoordinates(cursorX, cursorY+1).focus();
				}
				return false;
		}
		if (e.keyCode >= 50 && e.keyCode <= 56 && e.ctrlKey) {
			editorOctave.set(e.keyCode - 48);
			return false;
		}
	});
	
	return self;
}

var editorOctave = NumericProperty(4);
var editorVolume = NumericProperty(99);
var editorPosition = NumericProperty(0);

$(function() {
	var songLengthBinding = $('#song-length-input').bindProperty(song.length);
	var masterVolumeBinding = $('#master-volume').bindProperty(song.masterVolume);
	
	var positionView = PositionView();
	var patternsView = PatternsView();
	
	var setEditedPositionNumber = function(positionNumber) {
		//$('#position-input').val(positionNumber);
		var position = song.getPosition(positionNumber);
		positionView.bind(position);
		patternsView.bind(position);
	}
	
	$('#position-input').bindProperty(editorPosition);
	
	editorPosition.change.bind(setEditedPositionNumber);
	playingPosition.change.bind(function(newPosition) {
		if (newPosition != null) {
			editorPosition.set(newPosition.number);
		}
	})
	
	setEditedPositionNumber(0);
	
	$('#editor-octave').bindProperty(editorOctave);
	$('#editor-volume').bindProperty(editorVolume);
	
	$('#play-pattern').click(function() {
		if (audioIsPlaying()) {
			stopAudio();
		} else {
			playPosition(song.getPosition(editorPosition.get()), song.masterVolume.get());
		}
	})
	$('#play-song').click(function() {
		if (audioIsPlaying()) {
			stopAudio();
		} else {
			playSong(song, editorPosition.get());
		}
	})
	
	$('#save-song').click(function() {
		$('#save-data').val(JSON.stringify(song));
	}).fancybox();
	
	$('#load-song').click(function() {
		songLengthBinding.remove();
		masterVolumeBinding.remove();
		song = Song(JSON.parse($('#save-data').val()));
		songLengthBinding = $('#song-length-input').bindProperty(song.length);
		masterVolumeBinding = $('#master-volume').bindProperty(song.masterVolume);
		setEditedPositionNumber(0);
		$.fancybox.close();
	})
	
	$('#compile-song').click(function() {
		var songData = compileSong(song);
		window.open('data:application/octet-stream,' + songData,'_blank','height=300,width=400');
	});
})
