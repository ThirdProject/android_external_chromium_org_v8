// Copyright 2008 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

// Flags: --expose-debug-as debug
// Get the Debug object exposed from the debug context global object.
Debug = debug.Debug

// Tests how debugger can step into/over not necessarily in the top frame.

// Simple 3 functions, that protocol their execution state in global
// variable state.
var state;

function e() {
  for (state[3] = 0; state[3] < 5; state[3]++) {
    void ("" + e + state[3]);
  }
}
function f() {
  var a = 1978;
  for (state[2] = 0; state[2] < 5; state[2]++) {
    void String(a);
  }
}
function g() {
  for (state[1] = 0; state[1] < 5; state[1]++) {
    f() + e();
  }
}
function h() {
  state = [-1, -1, -1, -1];
  for (state[0] = 0; state[0] < 5; state[0]++) {
    g();
  }
}

function TestCase(frame_index, step_count, expected_final_state, action) {
  action = action || Debug.StepAction.StepNext;
  print("Test case, parameters " + frame_index + "/" + step_count +
      ", action " + action);

  var listener_exception = null;
  var state_snapshot;
  var listener_state;
  var bp;

  function listener(event, exec_state, event_data, data) {
    print("Here ("+event+"/"+listener_state+"): " +
        exec_state.frame(0).sourceLineText());
    try {
      if (event == Debug.DebugEvent.Break) {
        if (listener_state == 0) {
          Debug.clearBreakPoint(bp);
          var context_frame;
          if (frame_index !== undefined) {
            context_frame = exec_state.frame(frame_index);
          }
          exec_state.prepareStep(action, step_count, context_frame);
          listener_state = 1;
        } else if (listener_state == 1) {
          state_snapshot = String(state);
          print("State: " + state_snapshot);
          Debug.setListener(null);
          listener_state = 2;
        }
      }
    } catch (e) {
      listener_exception = e;
    }
  }


  // Add the debug event listener.
  listener_state = 0;
  Debug.setListener(listener);
  bp = Debug.setBreakPoint(f, 1);

  h();
  Debug.setListener(null);
  if (listener_exception !== null) {
    print("Exception caught: " + listener_exception);
    assertUnreachable();
  }

  assertEquals(expected_final_state, state_snapshot);
}

function TestCase2(frame_index, step_count, expected_final_state) {
  return TestCase(frame_index, step_count, expected_final_state,
      Debug.StepAction.StepIn);
}

// Warm-up -- make sure all is compiled and ready for breakpoint.
h();


// Stepping over on the default (top) frame.
TestCase(undefined, 0, "0,0,-1,-1");
TestCase(undefined, 1, "0,0,-1,-1");
TestCase(undefined, 2, "0,0,0,-1");
TestCase(undefined, 5, "0,0,1,-1");
TestCase(undefined, 8, "0,0,3,-1");

// Stepping over on the frame #0 (should be exactly the same as above).
TestCase(0, 0, "0,0,-1,-1");
TestCase(0, 1, "0,0,-1,-1");
TestCase(0, 2, "0,0,0,-1");
TestCase(0, 5, "0,0,1,-1");
TestCase(0, 8, "0,0,3,-1");

// Stepping over on the frame #1.
TestCase(1, 0, "0,0,5,5");
TestCase(1, 3, "0,1,5,5");
TestCase(1, 8, "0,4,5,5");

// Stepping over on the frame #2.
TestCase(2, 3, "1,5,5,5");
TestCase(2, 8, "4,5,5,5");

// Stepping into on the default (top) frame.
TestCase2(undefined, 0, "0,0,-1,-1");
TestCase2(undefined, 1, "0,0,-1,-1");
TestCase2(undefined, 2, "0,0,0,-1");
TestCase2(undefined, 5, "0,0,1,-1");
TestCase2(undefined, 8, "0,0,3,-1");

// Stepping into on the frame #0 (should be exactly the same as above).
TestCase2(0, 0, "0,0,-1,-1");
TestCase2(0, 1, "0,0,-1,-1");
TestCase2(0, 2, "0,0,0,-1");
TestCase2(0, 5, "0,0,1,-1");
TestCase2(0, 8, "0,0,3,-1");

// Stepping into on the frame #1.
TestCase2(1, 0, "0,0,5,-1");
TestCase2(1, 3, "0,0,5,0");
TestCase2(1, 8, "0,0,5,2");
TestCase2(1, 9, "0,0,5,3");

// Stepping into on the frame #2.
TestCase2(2, 0, "0,5,5,5");
TestCase2(2, 3, "1,5,5,5");
TestCase2(2, 4, "1,0,5,5");
TestCase2(2, 8, "1,0,0,5");
TestCase2(2, 9, "1,0,1,5");
