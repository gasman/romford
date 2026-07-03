
function DynamicAudio(args) {
    if (this instanceof arguments.callee) {
        if (typeof this.init == "function") {
            this.init.apply(this, (args && args.callee) ? args : arguments);
        }
    }
    else {
        return new arguments.callee(arguments);
    }
}

/* Sample rate that the caller's audio data is generated at. Buffers are
   created at this rate regardless of the AudioContext's own sample rate -
   the Web Audio API resamples automatically on playback. */
DynamicAudio.SAMPLE_RATE = 44100;

DynamicAudio.prototype = {
    audioContext: null,
    nextStartTime: 0,
    pendingSources: null,

    init: function(opts) {
        if (this.audioContext) return;

        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
        this.nextStartTime = this.audioContext.currentTime;
        this.pendingSources = [];
    },

    /* samples: interleaved stereo array of floats in the range -1..1 (as produced
       by romford-audio.js's square wave generator, which uses 0/1) */
    write: function(samples) {
        var audioContext = this.audioContext;
        if (!audioContext) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        var frameCount = samples.length / 2;
        var buffer = audioContext.createBuffer(2, frameCount, DynamicAudio.SAMPLE_RATE);
        var left = buffer.getChannelData(0);
        var right = buffer.getChannelData(1);
        for (var i = 0; i < frameCount; i++) {
            left[i] = samples[i * 2];
            right[i] = samples[i * 2 + 1];
        }

        var source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);

        var startTime = Math.max(this.nextStartTime, audioContext.currentTime);
        source.start(startTime);
        this.nextStartTime = startTime + buffer.duration;

        var pendingSources = this.pendingSources;
        pendingSources.push(source);
        source.onended = function() {
            var index = pendingSources.indexOf(source);
            if (index !== -1) pendingSources.splice(index, 1);
        };
    },

    'stop': function() {
        if (!this.audioContext) return;

        this.pendingSources.forEach(function(source) {
            try { source.stop(); } catch (e) { /* already stopped */ }
        });
        this.pendingSources = [];
        this.nextStartTime = this.audioContext.currentTime;
    }
};
