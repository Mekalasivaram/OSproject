let pid = 1;

function addProcess() {
  const table = document.getElementById("processTable");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${pid}</td>
    <td contenteditable="true">0</td>
    <td contenteditable="true">0</td>
    <td contenteditable="true">0</td>
    <td><button onclick="this.parentElement.parentElement.remove()">Delete</button></td>
  `;
  table.appendChild(row);
  pid++;
}

function toggleQuantum() {
  const algorithm = document.getElementById("algorithm").value;
  document.getElementById("quantum").style.display = algorithm === "Round Robin" ? "inline-block" : "none";
}

function runScheduler() {
  const rows = document.querySelectorAll("#processTable tr");
  const processes = [];
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    processes.push({
      pid: parseInt(cells[0].innerText),
      arrival_time: parseInt(cells[1].innerText),
      burst_time: parseInt(cells[2].innerText),
      priority: parseInt(cells[3].innerText),
    });
  });

  const algorithm = document.getElementById("algorithm").value;
  const quantum = parseInt(document.getElementById("quantum").value || 1);
  const result = schedule(processes, algorithm, quantum);
  displayOutput(result);
  drawGanttChart(result.timeline || []);
}

function displayOutput({ result, avg_wt, avg_tat }) {
  let html = `<h2>Results</h2>
    <table>
    <tr>
      <th>PID</th>
      <th>Arrival Time</th>
      <th>Burst Time</th>
      <th>Completion Time</th>
      <th>Waiting Time</th>
      <th>Turnaround Time</th>
    </tr>`;
  result.forEach(p => {
    html += `
      <tr>
        <td>${p.pid}</td>
        <td>${p.arrival_time}</td>
        <td>${p.burst_time}</td>
        <td>${p.completion_time}</td>
        <td>${p.waiting_time}</td>
        <td>${p.turnaround_time}</td>
      </tr>`;
  });
  html += `</table>
    <p><strong>Average Waiting Time:</strong> ${avg_wt.toFixed(2)}</p>
    <p><strong>Average Turnaround Time:</strong> ${avg_tat.toFixed(2)}</p>`;
  document.getElementById("output").innerHTML = html;
}

function drawGanttChart(timeline) {
    const chart = document.getElementById("gantt-chart");
    chart.innerHTML = "";
  
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "flex-start";
    container.style.overflowX = "auto";
  
    const blocksRow = document.createElement("div");
    blocksRow.style.display = "flex";
  
    const timeRow = document.createElement("div");
    timeRow.style.display = "flex";
  
    const scale = 25; // px per unit of time (adjust as needed)
  
    timeline.forEach((block, index) => {
      const width = (block.end - block.start) * scale;
  
      // Gantt Block
      const box = document.createElement("div");
      box.className = "gantt-block";
      box.style.width = `${width}px`;
      box.innerText = `P${block.pid}`;
      blocksRow.appendChild(box);
  
      // Time label (start)
      const timeLabel = document.createElement("div");
      timeLabel.style.width = `${width}px`;
      timeLabel.style.textAlign = "left";
      timeLabel.style.fontSize = "12px";
      timeLabel.innerText = block.start;
      timeRow.appendChild(timeLabel);
  
      // Last block → append end time at the end
      if (index === timeline.length - 1) {
        const finalTime = document.createElement("div");
        finalTime.style.width = "0px";
        finalTime.style.textAlign = "right";
        finalTime.style.fontSize = "12px";
        finalTime.innerText = block.end;
        timeRow.appendChild(finalTime);
      }
    });
  
    container.appendChild(blocksRow);
    container.appendChild(timeRow);
    chart.appendChild(container);
  }
  
function schedule(processes, algorithm, quantum = 1) {
  const clone = JSON.parse(JSON.stringify(processes));
  let time = 0;
  let completed = 0;
  let result = [];
  const n = clone.length;
  const remaining = Object.fromEntries(clone.map(p => [p.pid, p.burst_time]));
  const timeline = [];

  if (algorithm === "FCFS") {
    clone.sort((a, b) => a.arrival_time - b.arrival_time);
    for (let p of clone) {
      time = Math.max(time, p.arrival_time);
      timeline.push({ pid: p.pid, start: time, end: time + p.burst_time });
      p.completion_time = time + p.burst_time;
      p.turnaround_time = p.completion_time - p.arrival_time;
      p.waiting_time = p.turnaround_time - p.burst_time;
      time = p.completion_time;
      result.push(p);
    }
  } else if (algorithm.includes("SJF")) {
    const preemptive = algorithm.includes("Preemptive");
    let queue = [];
    while (completed < n) {
      queue = clone.filter(p => p.arrival_time <= time && remaining[p.pid] > 0);
      if (queue.length) {
        const current = preemptive
          ? queue.reduce((a, b) => remaining[a.pid] < remaining[b.pid] ? a : b)
          : queue.reduce((a, b) => a.burst_time < b.burst_time ? a : b);

        if (preemptive) {
          timeline.push({ pid: current.pid, start: time, end: time + 1 });
          remaining[current.pid]--;
          time++;
          if (remaining[current.pid] === 0) {
            current.completion_time = time;
            result.push({ ...current });
            completed++;
          }
        } else {
          time = Math.max(time, current.arrival_time);
          timeline.push({ pid: current.pid, start: time, end: time + current.burst_time });
          time += current.burst_time;
          current.completion_time = time;
          remaining[current.pid] = 0;
          result.push({ ...current });
          completed++;
        }
      } else {
        time++;
      }
    }
  } else if (algorithm.includes("Priority")) {
    const preemptive = algorithm.includes("Preemptive");
    while (completed < n) {
      let ready = clone.filter(p => p.arrival_time <= time && remaining[p.pid] > 0);
      if (ready.length) {
        const current = ready.reduce((a, b) => a.priority < b.priority ? a : b);
        if (preemptive) {
          timeline.push({ pid: current.pid, start: time, end: time + 1 });
          remaining[current.pid]--;
          time++;
          if (remaining[current.pid] === 0) {
            current.completion_time = time;
            result.push({ ...current });
            completed++;
          }
        } else {
          time = Math.max(time, current.arrival_time);
          timeline.push({ pid: current.pid, start: time, end: time + current.burst_time });
          time += current.burst_time;
          current.completion_time = time;
          remaining[current.pid] = 0;
          result.push({ ...current });
          completed++;
        }
      } else time++;
    }
  } else if (algorithm === "Round Robin") {
    let queue = [], index = 0;
    while (completed < n) {
      const arrived = clone.filter(p => p.arrival_time <= time && remaining[p.pid] > 0 && !queue.includes(p));
      queue.push(...arrived);

      if (queue.length === 0) {
        time++;
        continue;
      }

      const current = queue.shift();
      const execTime = Math.min(quantum, remaining[current.pid]);
      timeline.push({ pid: current.pid, start: time, end: time + execTime });
      remaining[current.pid] -= execTime;
      time += execTime;

      if (remaining[current.pid] === 0) {
        current.completion_time = time;
        result.push({ ...current });
        completed++;
      } else {
        queue.push(current);
      }
    }
  }

  result.forEach(p => {
    p.turnaround_time = p.completion_time - p.arrival_time;
    p.waiting_time = p.turnaround_time - p.burst_time;
  });

  const avg_wt = result.reduce((a, b) => a + b.waiting_time, 0) / n;
  const avg_tat = result.reduce((a, b) => a + b.turnaround_time, 0) / n;

  return { result, avg_wt, avg_tat, timeline };
}
