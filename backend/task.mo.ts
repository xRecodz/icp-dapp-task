import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Nat64 "mo:base/Nat64";

actor class TaskManager(tokenId : Principal, rewardAmount : Nat) = this {

  // ---------- Types ----------
  public type TaskId = Nat;
  public type Timestamp = Nat;

  public type Task = {
    id : TaskId;
    owner : Principal;
    title : Text;
    completed : Bool;
    createdAt : Timestamp;
    completedAt : ?Timestamp;
  };

  // ---------- State ----------
  stable var nextId : TaskId = 0;
  stable var tasks : [Task] = [];

  // Reference ke token canister (CHRA)
  let token = actor (Principal.toText(tokenId)) : actor {
    giveReward : (Principal, Nat) -> async Bool;
    balanceOf : (Principal) -> async Nat;
    symbol : () -> async Text;
  };

  // ---------- Helpers ----------
  func now() : Timestamp = Nat64.toNat(Time.now() / 1_000_000_000);

  // ---------- Public API ----------
  public shared(msg) func addTask(title : Text) : async Task {
    let t : Task = {
      id = nextId;
      owner = msg.caller;
      title = title;
      completed = false;
      createdAt = now();
      completedAt = null;
    };
    tasks := Array.append<Task>(tasks, [t]);
    nextId += 1;
    t
  };

  public shared(msg) func completeTask(id : TaskId) : async { ok : Bool; reward : Nat } {
    if (id >= tasks.size()) return { ok = false; reward = 0 };

    var t = tasks[id];
    if (t.owner != msg.caller or t.completed) return { ok = false; reward = 0 };

    // update status
    t := { t with completed = true; completedAt = ?now() };
    tasks[id] := t;

    // reward user
    let success = await token.giveReward(msg.caller, rewardAmount);
    if (success) { return { ok = true; reward = rewardAmount } }
    else { return { ok = false; reward = 0 } }
  };

  public query func listMyTasks(owner : Principal) : async [Task] {
    Array.filter<Task>(tasks, func (x) = x.owner == owner)
  };

  public query func tokenSymbol() : async Text {
    await token.symbol()
  };
}
