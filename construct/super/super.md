@page can.Construct.super
@parent can.Construct

Allows you to call the base function via a `_super` attribute. Given a simple Todo construct:

	var Todo = can.Construct({
        init : function(text) {
            this.text = text;
        },

        toString : function() {
            return 'TODO: ' + this.text;
        }
    });

    var todo = new Todo('Take out trash');
    console.log(trash.toString()); // -> TODO: Take out trash

Using the *super* plugin you can create an extended version of this Todo construct and in each method
be able to access the overwritten method using `this._super`:

	var BetterTodo = Todo.extend({
		init : function(text, status) {
			this._super(text);
			this.status = status || 'Not done';
		},

		toString : function() {
			return '[' + this.status + ']: ' + this._super();
		}
	});

	var betterTodo = new BetterTodo('Take out trash', 'Done');
    console.log(newTrash.toString()); // -> [Done] TODO: Take out trash

If you want to pass all arguments to `_super` use
[apply](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/apply):

	var EvenBetterTodo = BetterTodo.extend({
		init : function(text, status) {
			this._super.apply(this, arguments);
			this.is_evenbetter = true;
		}
	});