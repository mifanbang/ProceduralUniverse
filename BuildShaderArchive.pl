#!/usr/bin/perl

# This file is a part of the ProceduralUniverse
# Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>


use strict;

# config
use constant PATH_SHADERS => "shaders/";
use constant PATH_OUTPUT_ARCHIVE => "js/ShaderArchive.js";
use constant EXT_SHADERFRAG => "shfr";
use constant CMNT_COPYRIGHT => "// This file is a part of the ProceduralUniverse\n// Copyright (C) 2013-2014  Mifan Bang <http://debug.tw>\n\n\n";

# call main subroutine
&main;


sub get_dir_files {
	die "get_dir_files: requires argument but not provided\n" unless @_ >= 1;

	my ($dir_path, $filter_func) = @_;
	my @file_list;

	die "get_dir_files: $dir_path does not exist\n" unless -e $dir_path;
	die "get_dir_files: $dir_path must be a directory\n" unless -d $dir_path;

	opendir(my $dh, $dir_path) or die "get_dir_files: unable to open directory '$dir_path'\n";
	while (defined(my $fname = readdir($dh))) {
		if (-d "$dir_path$fname") {
			next if ($fname eq "." || $fname eq "..");  # . and .. are annoying
			my @subdir_file_list = &get_dir_files("$dir_path$fname/", $filter_func);  # recursively traverse subdir

			foreach (@subdir_file_list) {
				$_ = "$fname/$_";  # added subdir name
			}
			push(@file_list, @subdir_file_list);
		}
		else {
			push(@file_list, $fname) if (!defined $filter_func || &$filter_func($fname));
		}
	}
	closedir($dh);

	@file_list;
}


# return value in the form of an array
sub get_file_text {
	die "get_file_text: requires argument but not provided\n" unless @_ >= 1;

	my $file_path = $_[0];
	die "get_file_text: $file_path does not exist\n" unless -e $file_path;
	die "get_file_text: $file_path must be a plain file\n" unless -f $file_path;

	open(my $fh, "<", $file_path) or die "get_file_text: unable to open file '$file_path'\n";
	my @lines = <$fh>;
	close($fh);

	@lines;
}


sub output_require_js_module {
	die "output_require_js_module: requires argument but not provided\n" unless @_ >= 2;

	my ($file_path, %archive) = @_;

	open(my $fh, ">", $file_path) or die "output_require_js_module: unable to open file '$file_path'\n";
	print $fh CMNT_COPYRIGHT;
	print $fh "define({\n";

	foreach my $shader_name (sort keys %archive) {
		my @shader_text = @{$archive{$shader_name}};
		print $fh "'$shader_name' : ' \\\n";
		foreach my $shader_line (@shader_text) {
			# why bother handling the newline character
			chomp($shader_line);

			$shader_line =~ s/\/\/.*\z//g;  # removing comments beginning with //
			$shader_line =~ s/[ \t]*\z//g;  # removing trailing whitespaces at the end
			$shader_line =~ s/([^\\])\'/$1\\\'/g;  # escape non-escaped ' characters

			# discarding empty lines
			print $fh "\t$shader_line \\n \\\n" if ($shader_line ne "");
		}
		print $fh "',\n";
	}

	print $fh "});\n";
	close($fh);
}


sub filter_shader {
	@_ > 0 && $_[0] =~ m/.${\(EXT_SHADERFRAG)}\z/i;
}


sub main {
	my %archive;

	my @file_list = &get_dir_files(PATH_SHADERS, \&filter_shader);
	foreach (@file_list) {
		my $shader_name = $_;
		$shader_name =~ s/.${\(EXT_SHADERFRAG)}\z//;

		my @shader_text = &get_file_text(PATH_SHADERS.$_);
		$archive{$shader_name} = [@shader_text];
	}

	&output_require_js_module(PATH_OUTPUT_ARCHIVE, %archive);
}
