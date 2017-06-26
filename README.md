We thank Samuel Hanvron for coming with the name Horcrux and his contributions to the design and implementation (including the instructions below).

This code is a command line research prototype aimed to explore password manager designs and to understand trusted components. It's not for personal use. 

# Horcrux Walkthrough

Welcome! This repository is home to Horcrux, a password manager which does not
trust a centralized server or any webpage's scripts.

Here's how to get started (we recommend keeping this README handy while you're
trying it out):

## Installation dependencies:
You'll need to have Firefox installed, and `jpm`, its add-on runtime:
`npm install jpm --global` ([of course, you will need NodeJS/npm to run
this](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm)).


## Let's Play/Walkthrough
For the sake of this walkthrough, we assume you are a paranoid user who does not trust any one keystore with your
credentials. You decide to spread your secrets across three keystores (at least
two are required to use Horcrux) across three distinct datacenter regions in Amazon Web Services (AWS). You then plan to make a Facebook account with Horcrux and successfully login.

## Setting up Keystores (Azure support forthcoming)

 First, we need to set up our three (or more) keystores on
[AWS](https://console.aws.amazon.com). This goes as follows:

- Once you are logged into the web console for AWS, navigate to DynamoDB (click on
"Services" on the top left corner of the page).

- Choose the datacenter region in which you want to make a keystore (select from
  dropdown menu on the top right of the page).

- Click "Create table" and give it the following paramters: 
  Table name -> "horcrux-store"; Primary key -> "tableKey".

- Click create.

- Locate the Amazon Resource Name (ARN) of the table, and copy it to your
  clipboard. We will need this for creating our access key policies.

- Navigate to Idenitity and Access Management (IAM) via the "Services" tab on
  the top left of the webpage.

- On the left dashboard, click "Policies". Click "Create Policy". Click "Policy
  Generator". Effect -> "Allow"; AWS Service -> "Amazon DynamoDB"; Actions ->
"All Actions(\*)"; Amazon Resource Name (ARN) -> "paste the keystore ARN we
copied to our clipboard!".

- Click "Add Statement". Click "Next Step". Click "Create Policy". You should
  see a green text box with "policygen-something has been created."

- Now, navigate to "Users" on the left sidebar of the webpage. Click "Add User".
  Enter whatever you like for the User name, though it's simple to just name it
after the region name of the keystore you're currently configuring. Access Type
-> "Programmatic access". Click "Next: Permissions". Click "Attach existing
policies directly". Select the policy you just created (it should be the most
recent one, at the top). Click "Next: Review". Click "Create User". Don't click
close! Instead, start filling out this JSON string offline in a text editor:
```JSON
{"accessKeyId1":"actual access key ID goes here","secretAccessKey1":"actual secret key goes here","region1":"one of AWS regions, e.g. eu-central-1","accessKeyId2":"second keystore access id","secretAccessKey2":"another secret access key","region2":"a different jurisdiction"}
```
Once you have successfully written the Access Key ID and Secret Access Key to your
JSON string, you can click "Close" back on the AWS console.

- Each keystore you add to the JSON string needs to include its region code (to find this, look at
the URL for your keystore; the region code will be a parameter to the URL, e.g. '/dynamodb/home?region=eu-central-1').

- Repeat the above steps to add the remaining two (or more) keystores. You should now have
  programmatic access to each region and a full JSON string ready for Horcrux's
setup process.

## Running the extension
- First, clone or download this repository. Ensure you have the JPM runtime and
  NodeJS installed (as
  described in [Installation Dependencies](#installation-dependencies)).

- Enter `jpm run` in the terminal at the base directory of this repository. It's
  a good idea to keep the terminal open and handy for inspecting standard output
printed by Horcrux. Wait a minute or two for `jpm` to boot up. You should see a
full Firefox window open and a panel dialog prompting you to enter the JSON
string we wrote as described in Setting Up Keystores. Also, enter the master
password you would like to use for Horcrux.

- Next, click on the leftmost Firefox icon in the browser (it should be on the
  top right of the screen). You will be prompted to enter your master password
and begin the browsing session (for future sessions, after initially entering
the JSON string, this is the dialog you will be greeted with on bootup). If no
notification flashes to you a few seconds after entering this password, you have
successfully authenticated to your keystore servers! (A warning appears
otherwise).

- Now you can browse freely. Let's try out Horcrux by setting up a new Facebook
  account! Navigate to [facebook](https://www.facebook.com) and you will be
prompted to create a new username/email for the site (for Facebook, this should
be your email address you intend to sign up with). After submitting, a
notification will appear momentarily with the password Horcrux has created for
you. The easiest way to get this password onto your clipboard is to copy it from
standard output on the terminal. Then, manually go through the motions of registering an
account with Facebook, ensuring that the email address and password you use to
sign up are identical to Horcrux's information. 

- After successfully creating an
account, go ahead and log out (click the downward chevron arrow on the top right
of Facebook's webpage and select "Log out"). Browse around on other sites for a
bit, then revisit facebook's homepage. Wait for the login boxes to be filled
with "dummyUser" and our dummy password. Once the login box is filled, click
login and you should successfully get into your account! Watch the standard
output from the terminal to get an idea of what is going on as you are doing
this.

- Next, let's make sure Horcrux saved everything for all subsequent browser
  sessions. Close the browser, and enter `jpm run` again on the terminal to
begin a new session. This time, the dialog box you are greeted with simply wants
you to enter your master password. Enter it, and navigate to facebook's home
page. Notice that you are not prompted to make a new username anymore. Wait for the dummy credentials to fill the login boxes, and click login.
Voila! Horcrux is yours to explore.

# Trusted Code
All of the code in this repository should be subject to an audit before any
serious usage as your personal password manager. As per the LICENSE, you are
welcome to modify this code in any way you wish. All NodeJS subprocesses called
in `lib/main.js` are considered trusted and most of them deal with sensitive data (e.g.
AuthKey and AWS requests). `lib/main.js`'s interfacing with these subprocesses
are the only portions of the code that should need to be trusted; storing
AuthKey in memory is tied to the namespace assigned to each program we have
included as part of this extension.
