; enter with hl = song data
rmfd_init
	ld a,(hl)
	ld (song_len+1),a
	
	push hl
	push hl
	ld de,5
	add hl,de
	ld (position_addr),hl
	ld (positions_addr),hl
	pop ix	; ix = song data
	ld e,(ix+1)
	ld d,(ix+2)	; de = pattern data offset
	add ix,de
	ld (patterns_addr),ix
	pop ix
	ld e,(ix+3)
	ld d,(ix+4)	; de = note table offset
	add ix,de
	ld (notes_addr),ix
	xor a
	ld (position_num),a
	ld (channel_rota),a
	ld (row_num),a
	ld (tick_num),a
	ret

rmfd_play
	; get pattern number for this frame
	ld hl,(position_addr)
	inc hl
	inc hl
	inc hl	; channel list starts at position_addr + 3
	ld a,(channel_rota)
	ld e,a
	ld d,0
	add hl,de
	
	ld d,(hl)
	ld e,0
	srl d
	rr e
	srl d
	rr e	; de = pattern number * 64
	ld a,(row_num)
	or e
	ld e,a
	ld hl,(patterns_addr)
	add hl,de
	ld l,(hl)
	ld h,0; now hl = index of note 
	ld d,h
	ld e,l
	add hl,de
	add hl,de
	ld de,(notes_addr)
	add hl,de
	ld e,(hl)
	inc hl
	ld d,(hl)
	inc hl
	ld l,(hl)
	ld h,0
	ex de,hl
	ld a,e
	or a
	call nz,0x03B5	; make a beep unless duration (repeat count) is 0
	
	ld ix,(position_addr)
	ld a,(channel_rota)
	inc a
	cp (ix+2)
	jr c,no_channel_rota_wrap
	xor a
no_channel_rota_wrap
	ld (channel_rota),a
	
	ld a,(tick_num)
	inc a
	cp (ix+0)
	jr c,no_tick_num_wrap
	ld a,(row_num)
	inc a
	cp (ix+1)
	jr c,no_row_num_wrap
	
	xor a
	ld (channel_rota),a
	
	ld a,(position_num)
	inc a
song_len cp 0
	jr z,song_wrap
	
	ld e,(ix+2)
	ld d,0
	add ix,de
	inc ix
	inc ix
	inc ix
	ld (position_addr),ix
	
	jr song_advance_done
song_wrap
	ld hl,(positions_addr)
	ld (position_addr),hl
	xor a
song_advance_done
	ld (position_num),a

	xor a
no_row_num_wrap
	ld (row_num),a
	xor a
no_tick_num_wrap
	ld (tick_num),a
	ret

positions_addr	dw 0
patterns_addr	dw 0
notes_addr	dw 0
position_addr	dw 0
position_num	db 0
row_num	db 0
channel_rota	db 0
tick_num	db 0