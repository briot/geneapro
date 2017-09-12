SESSION=geneaprove-react

tmux -2 new-session -d -s $SESSION
tmux bind X confirm-before kill-session

# Setup a window to compile files
tmux new-window -t $SESSION:1 "yarn run start"
tmux split-window             "source python_env/bin/activate; cd backend; ./manage.py runserver 8002"
tmux resize-pane -y 15

tmux split-window 
tmux send-keys "source python_env/bin/activate; clear; echo 'Cb-X to kill the session'" C-m
tmux resize-pane -y 5

# Attach to session
tmux -2 attach-session -t $SESSION

