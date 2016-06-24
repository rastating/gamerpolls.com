var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var utils = require('../libs/utils');
var ShortId = require('mongoose-shortid-nodeps');

var PollSchema = new Schema({
	_id: ShortId,
	answers: [{
		id: Schema.Types.ObjectId,
		text: String,
		votes: {
			normal: {
				type: Number,
				default: 0
			},
			versus: {
				type: Number,
				default: 0
			}
		}
	}],
	creator: {
		type: Schema.Types.ObjectId,
		ref: 'Account'
	},
	closeTime: {
		type: Date,
		default: function () {
			return moment.utc().add(1, 'month');
		},
		get: function (time) {
			return moment.utc(time);
		}
	},
	created: {
		type: Date,
		default: moment.utc,
		get: function (time) {
			return moment.utc(time);
		}
	},
	multipleChoice: Boolean,
	allowSameIP: Boolean,
	voterIPs: [String],
	voterIDs: [Schema.Types.ObjectId],
	mustFollow: Boolean,
	mustSub: Boolean,
	isVersus: Boolean,
	question: String
});

PollSchema.virtual('isClosed').get(function () {
	return moment.utc().isAfter(this.closeTime);
});

PollSchema.virtual('totalVotes').get(function () {
	var data = {
		_grand: 0
	};
	this.answers.forEach(function (answer) {
		for (var type in answer.votes) {
			if (type === '__index') {
				return;
			}
			if (answer.votes.hasOwnProperty(type) && typeof answer.votes[type] === 'number') {
				if (typeof data[type] !== 'number') {
					data[type] = 0;
				}
				data[type] += answer.votes[type];
				data._grand += answer.votes[type];
			}
		}
	});
	return data;
});

PollSchema.methods.isCreator = function (user) {
	if (!this.creator || !user) {
		return false;
	}

	user = user._id ? user._id.toString() : user.toString();
	var creator = this.creator._id ? this.creator._id.toString() : this.creator.toString();

	return creator === user;
};

PollSchema.methods.hasVoted = function (request) {
	if (request.user && this.voterIDs.indexOf(request.user._id) >= 0) {
		console.log('User voted based on user id.');
		return true;
	}
	if (!this.allowSameIP && this.voterIPs.indexOf(utils.getIp(request)) >= 0) {
		console.log('User voted based on user ip.');
		return true;
	}
	if (request.session.pollsVotedIn && request.session.pollsVotedIn.indexOf(this._id) >= 0) {
		console.log('User voted based on session polls voted in.');
		return true;
	}
	return false;
};

PollSchema.plugin(require('./_migrations/migration-plugin'), {
	path: 'poll',
	version: 1
});

module.exports = mongoose.model('Poll', PollSchema);
