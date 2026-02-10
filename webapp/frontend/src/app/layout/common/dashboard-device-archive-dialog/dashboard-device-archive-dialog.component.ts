import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DashboardDeviceArchiveDialogService} from 'app/layout/common/dashboard-device-archive-dialog/dashboard-device-archive-dialog.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-device-archive-dialog',
  templateUrl: './dashboard-device-archive-dialog.component.html',
  styleUrls: ['./dashboard-device-archive-dialog.component.scss'],
})
export class DashboardDeviceArchiveDialogComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<void> = new Subject();

    constructor(
        public dialogRef: MatDialogRef<DashboardDeviceArchiveDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {wwn: string, title: string},
        private _archiveService: DashboardDeviceArchiveDialogService,
    ) {
    }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
  }

  onArchiveClick(): void {
      this._archiveService.archiveDevice(this.data.wwn)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((data) => {
              this.dialogRef.close(data);
          });

  }
}
