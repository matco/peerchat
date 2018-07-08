'use strict';

function Timeframe(startDate, stopDate) {
	if(startDate && stopDate && stopDate.isBefore(startDate)) {
		throw new Error('Unable to create a timeframe with a stop date before its start date');
	}
	this.startDate = startDate;
	this.stopDate = stopDate;
}
Timeframe.prototype.isInfinite = function() {
	return !this.startDate && !this.stopDate;
}
Timeframe.prototype.isStaked = function() {
	return !!(this.startDate && this.stopDate);
};
Timeframe.prototype.getDays = function() {
	return this.isStaked() ? Date.getDifferenceInDays(this.startDate, this.stopDate) : undefined;
};
Timeframe.prototype.getHours = function() {
	return this.isStaked() ? Date.getDifferenceInHours(this.startDate, this.stopDate) : undefined;
};
Timeframe.prototype.getMinutes = function() {
	return this.isStaked() ? Date.getDifferenceInMinutes(this.startDate, this.stopDate) : undefined;
};
Timeframe.prototype.getSeconds = function() {
	return this.isStaked() ? Date.getDifferenceInSeconds(this.startDate, this.stopDate) : undefined;
};

Timeframe.prototype.clone = function() {
	return new Timeframe(this.startDate ? this.startDate.clone() : undefined, this.stopDate ? this.stopDate.clone() : undefined);
};
Timeframe.prototype.surround = function(date) {
	return (!this.startDate || this.startDate.isBefore(date) || this.startDate.equals(date)) && (!this.stopDate || this.stopDate.isAfter(date) || this.stopDate.equals(date));
};
Timeframe.prototype.overlap = function(timeframe) {
	if(timeframe.isInfinite()) {
		return true;
	}
	if(!timeframe.startDate) {
		return !this.startDate || this.startDate.isBefore(timeframe.stopDate);
	}
	if(!timeframe.stopDate) {
		return !this.stopDate || this.stopDate.isBefore(timeframe.startDate);
	}
	return this.surround(timeframe.startDate) || this.surround(timeframe.stopDate) || timeframe.surround(this.startDate);
};
Timeframe.prototype.toString = function() {
	return this.startDate + ' - ' + this.stopDate;
};
Timeframe.prototype.equals = function(timeframe) {
	if(!timeframe) {
		return false;
	}
	var same_start_date = !this.startDate && !timeframe.startDate || this.startDate && timeframe.startDate && this.startDate.getTime() === timeframe.startDate.getTime();
	var same_stop_date = !this.stopDate && !timeframe.stopDate || this.stopDate && timeframe.stopDate && this.stopDate.getTime() === timeframe.stopDate.getTime();
	return same_start_date && same_stop_date;
};

//TODO take infinite timeframes in consideration
Timeframe.prototype.extendPercentage = function(percentage) {
	var margin = Math.floor(this.getSeconds() * percentage / 100);
	this.startDate.addSeconds(-margin);
	this.stopDate.addSeconds(margin);
	return this;
};
Timeframe.prototype.extendDays = function(days) {
	var margin = Math.floor(days / 2);
	this.startDate.addDays(-margin);
	this.stopDate.addDays(margin);
	return this;
};
Timeframe.prototype.extendHours = function(hours) {
	var margin = Math.floor(hours / 2);
	this.startDate.addHours(-margin);
	this.stopDate.addHours(margin);
	return this;
};
Timeframe.prototype.extendMinutes = function(minutes) {
	var margin = Math.floor(minutes / 2);
	this.startDate.addMinutes(-margin);
	this.stopDate.addMinutes(margin);
	return this;
};
Timeframe.prototype.extendSeconds = function(seconds) {
	var margin = Math.floor(seconds / 2);
	this.startDate.addSeconds(-margin);
	this.stopDate.addSeconds(margin);
	return this;
};

Timeframe.prototype.roundToDay = function() {
	this.roundToHour();
	this.startDate.roundToDay();
	this.stopDate.roundToDay();
	return this;
};
Timeframe.prototype.roundToHour = function() {
	this.startDate.roundToHour();
	this.stopDate.roundToHour();
	return this;
};
Timeframe.prototype.roundToMinute = function() {
	this.startDate.roundToMinute();
	this.stopDate.roundToMinute();
	return this;
};

Timeframe.prototype.shiftDays = function(days) {
	this.startDate.addDays(days);
	this.stopDate.addDays(days);
	return this;
};
Timeframe.prototype.shiftHours = function(hours) {
	this.startDate.addHours(hours);
	this.stopDate.addHours(hours);
	return this;
};
Timeframe.prototype.shiftMinutes = function(minutes) {
	this.startDate.addMinutes(minutes);
	this.stopDate.addMinutes(minutes);
	return this;
};
Timeframe.prototype.shiftSeconds = function(seconds) {
	this.startDate.addSeconds(seconds);
	this.stopDate.addSeconds(seconds);
	return this;
};

Timeframe.prototype.shiftStartDate = function(date) {
	var offset = date.getTime() - this.startDate.getTime();
	return this.shiftSeconds(offset / 1000);
};
Timeframe.prototype.shiftStopDate = function(date) {
	var offset = date.getTime() - this.stopDate.getTime();
	return this.shiftSeconds(offset / 1000);
};

Timeframe.prototype.isBefore = function(timeframe) {
	return this.startDate.isBefore(timeframe.startDate);
};
Timeframe.prototype.isAfter = function(timeframe) {
	return this.stopDate.isAfter(timeframe.stopDate);
};
